import { Router } from "express";
import https from "https";
import { generateAudioOverview } from "../audio"; // We will use this or a custom fetch for ElevenLabs

export const researchEngineRouter = Router();

researchEngineRouter.post("/search", async (req, res) => {
  const { query, sourceType, numResults } = req.body;
  const tavilyKey = req.headers["x-tavily-key"] as string;

  try {
    if (tavilyKey) {
      const payload = JSON.stringify({
        api_key: tavilyKey,
        query,
        max_results: numResults || 10,
        search_depth: "advanced",
      });

      const tavilyResult = await new Promise<any>((resolve) => {
        const request = https.request({
          hostname: "api.tavily.com",
          path: "/search",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        }, (response) => {
          let data = "";
          response.on("data", d => data += d);
          response.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve({ success: true, json });
            } catch (e) {
              resolve({ success: false });
            }
          });
        });
        request.on("error", () => resolve({ success: false }));
        request.setTimeout(20000, () => { request.destroy(); resolve({ success: false }); });
        request.write(payload);
        request.end();
      });

      if (tavilyResult.success && tavilyResult.json?.results?.length) {
        const academicDomains = [
          "pewresearch.org","arxiv.org","ncbi.nlm.nih.gov","pubmed.ncbi.nlm.nih.gov",
          "scholar.google.com","semanticscholar.org","jstor.org","ssrn.com","nber.org",
          "brookings.edu","rand.org","mit.edu","harvard.edu","stanford.edu",
          "biorxiv.org","plos.org","europepmc.org","core.ac.uk","doaj.org",
          "worldbank.org","imf.org","oecd.org","bls.gov","cdc.gov","gao.gov",
        ];
        const results = tavilyResult.json.results.map((r: any) => {
          const lowerUrl = (r.url || "").toLowerCase();
          const isAcademic = academicDomains.some(d => lowerUrl.includes(d));
          let type = "article";
          if (lowerUrl.includes(".pdf")) type = "whitepaper";
          else if (lowerUrl.includes("wikipedia.org")) type = "wikipedia";
          else if (isAcademic || lowerUrl.includes(".edu") || lowerUrl.includes(".ac.")) type = "academic";
          else if (lowerUrl.includes(".gov") || lowerUrl.includes(".org")) type = "official";

          return { title: r.title, url: r.url, description: r.content || "", sourceType: type };
        });
        return res.json({ success: true, results });
      }
    }

    // Fallback APIs
    const encodedQuery = encodeURIComponent(query);
    const wantAcademic = sourceType === "academic" || sourceType === "academic-only" || sourceType === "whitepaper";
    const wantAll = sourceType === "all";
    
    const hostname = (wantAcademic || (wantAll && query.toLowerCase().includes("research"))) ? "api.openalex.org" : "en.wikipedia.org";
    const apiPath = hostname === "api.openalex.org" 
      ? `/works?search=${encodedQuery}&per-page=${numResults}`
      : `/w/api.php?action=query&list=search&srsearch=${encodedQuery}&utf8=&format=json&srlimit=${numResults}`;

    const options = {
      hostname,
      path: apiPath,
      method: "GET",
      headers: { "User-Agent": "SchmoCoResearchEngine/1.0 (mailto:schmoco@example.com)" }
    };

    const request = https.request(options, (response) => {
      let data = "";
      response.on("data", chunk => data += chunk);
      response.on("end", () => {
        try {
          const results = [];
          const json = JSON.parse(data);
          
          if (hostname === "api.openalex.org" && json.results) {
            for (const work of json.results) {
              if (work.title && work.id) {
                results.push({
                  title: work.title,
                  url: work.primary_location?.landing_page_url || work.id,
                  description: (work.abstract_inverted_index ? "Abstract available." : "Scholarly article.") + (work.publication_year ? ` Published ${work.publication_year}.` : ""),
                  sourceType: "academic",
                  site: work.primary_location?.source?.display_name || "OpenAlex"
                });
              }
            }
          } else if (hostname !== "api.openalex.org" && json.query && json.query.search) {
            for (const item of json.query.search) {
              const cleanSnippet = item.snippet.replace(/<[^>]+>/g, "");
              results.push({
                title: item.title,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
                description: cleanSnippet,
                sourceType: "wikipedia",
                site: "wikipedia.org"
              });
            }
          }
          
          res.json({ success: results.length > 0, results });
        } catch (e: any) {
          res.json({ success: false, error: "Failed to parse search results" });
        }
      });
    });

    request.on("error", (error) => {
      res.json({ success: false, error: error.message });
    });

    request.setTimeout(15000, () => {
      request.destroy();
      res.json({ success: false, error: "Search timed out" });
    });

    request.end();

  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

researchEngineRouter.post("/fetch", async (req, res) => {
  const { url } = req.body;
  const http = require("http");

  const doFetch = (targetUrl: string, redirectsLeft = 5): Promise<any> => new Promise((resolve) => {
    if (redirectsLeft === 0) return resolve({ success: false, error: "Too many redirects" });
    let parsed;
    try { parsed = new URL(targetUrl); } catch (e) { return resolve({ success: false, error: "Invalid URL" }); }

    const protocol = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 12000,
    };

    const request = protocol.request(options, (response: any) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const loc = response.headers.location;
        const next = loc.startsWith("http") ? loc : `${parsed.protocol}//${parsed.host}${loc}`;
        response.resume();
        return doFetch(next, redirectsLeft - 1).then(resolve);
      }
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => { if (data.length < 500000) data += chunk; });
      response.on("end", () => resolve({ success: true, content: data }));
    });
    request.on("error", (e: Error) => resolve({ success: false, error: e.message }));
    request.on("timeout", () => { request.destroy(); resolve({ success: false, error: "Request timed out" }); });
    request.end();
  });

  try {
    const result = await doFetch(url);
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

researchEngineRouter.post("/podcast", async (req, res) => {
  const { lines } = req.body;
  const apiKey = req.headers["x-elevenlabs-key"] as string || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.json({ success: false, error: "ElevenLabs API key not provided" });
  }

  const VOICE_A_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
  const VOICE_B_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

  try {
    const BATCH_SIZE = 4;
    const audioChunks: Array<Buffer | null> = new Array(lines.length).fill(null);
    
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (line: any) => {
          const text = line.text;
          const voiceId = line.speaker === "host1" ? VOICE_A_ID : VOICE_B_ID;
          
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
            signal: AbortSignal.timeout(30000),
          });
          
          if (!response.ok) {
            console.warn(`[audio] ElevenLabs error ${response.status}: ${await response.text()}`);
            return null;
          }
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        })
      );
      results.forEach((chunk, j) => { audioChunks[i + j] = chunk; });
    }
    
    const validChunks = audioChunks.filter((c): c is Buffer => c !== null);
    if (validChunks.length === 0) {
      return res.json({ success: false, error: "All synthesis requests failed." });
    }
    
    const finalAudio = Buffer.concat(validChunks);
    
    res.json({
      success: true,
      audio: finalAudio.toString("base64"),
      mimeType: "audio/mpeg",
      provider: "elevenlabs"
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});
