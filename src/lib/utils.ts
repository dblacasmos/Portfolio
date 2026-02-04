type ClassValue = string | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" ");
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/**
 * Smooth scroll to a section with offset for sticky navbar
 */
export function scrollToSection(id: string): void {
  const element = document.getElementById(id);
  if (element) {
    // Account for sticky navbar height (approximately 64-80px depending on scroll state)
    const navbarOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - navbarOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
}
