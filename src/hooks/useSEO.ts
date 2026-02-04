import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  type?: "website" | "article";
}

/**
 * Custom hook to manage document head meta tags for SEO
 * Since react-helmet-async doesn't support React 19 yet,
 * we use direct DOM manipulation
 */
export function useSEO({
  title,
  description,
  ogImage,
  canonical,
  type = "website",
}: SEOProps) {
  useEffect(() => {
    // Store original values for cleanup
    const originalTitle = document.title;
    const originalMetas: { name: string; content: string }[] = [];

    // Update document title
    document.title = title;

    // Helper to set or create meta tag
    const setMeta = (
      attribute: "name" | "property",
      name: string,
      content: string
    ) => {
      let meta = document.querySelector(
        `meta[${attribute}="${name}"]`
      ) as HTMLMetaElement | null;

      if (meta) {
        originalMetas.push({ name, content: meta.content });
        meta.content = content;
      } else {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, name);
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    // Set meta tags
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    setMeta("property", "og:title", title);
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:card", "summary_large_image");

    if (ogImage) {
      const absoluteUrl = ogImage.startsWith("http")
        ? ogImage
        : `${window.location.origin}${ogImage}`;
      setMeta("property", "og:image", absoluteUrl);
      setMeta("name", "twitter:image", absoluteUrl);
    }

    if (canonical) {
      let link = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;

      if (link) {
        link.href = canonical;
      } else {
        link = document.createElement("link");
        link.rel = "canonical";
        link.href = canonical;
        document.head.appendChild(link);
      }
    }

    // Cleanup function
    return () => {
      document.title = originalTitle;
      // Note: We're not removing the meta tags on cleanup
      // as they'll be replaced by the next page's SEO hook
    };
  }, [title, description, ogImage, canonical, type]);
}
