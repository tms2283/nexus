import { useEffect } from "react";

export default function Contact() {
  useEffect(() => {
    window.location.href = "/contact.html";
  }, []);

  return null;
}
