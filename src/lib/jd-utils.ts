export function parseRoleFromJDText(text?: string) {
  if (!text) return '';
  const firstLine = text.trim().split('\n')[0] || '';
  if (!firstLine) return '';
  const cleanedLine = firstLine.replace(/Job Title:/i, '').trim();
  const segments = cleanedLine
    .split(/[|–—-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments[0] || '';
}

export function parseCompanyFromJDText(text?: string) {
  if (!text) return '';
  const firstLine = text.trim().split('\n')[0] || '';
  const segments = firstLine
    .split(/[|–—-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return segments[1];
  }

  const matchAbout = text.match(/About\s+([\w\s&.,]+)/i);
  if (matchAbout?.[1]) {
    return matchAbout[1].trim();
  }

  const matchCompany = text.match(/Company[:\s-]+([^\n]+)/i);
  if (matchCompany?.[1]) {
    return matchCompany[1].trim();
  }

  const foundedMatch = text.match(
    /(?:Founded in [^,\n]+,\s*)?([A-Z][\w& ]{1,60}?)\s+(?:is|was|has|offers|provides|delivers)\s+/i,
  );
  if (foundedMatch?.[1]) {
    return foundedMatch[1].trim();
  }

  const companyIsMatch = text.match(/([A-Z][\w& ]{1,60}?)(?=\s+(?:is|was|offers|provides))/);
  if (companyIsMatch?.[1]) {
    return companyIsMatch[1].trim();
  }

  return '';
}

export function parseLocationFromJDText(text?: string) {
  if (!text) return '';
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean) as string[];
  for (const line of lines) {
    if (!line) {
      continue;
    }
    const locationLine = line.replace(/^(?:Location|Based in|Work Mode)[:\s]+/i, '');
    if (locationLine === line) {
      continue;
    }
    const [locationSegment = ''] = locationLine.split('(');
    return locationSegment.trim();
  }

  const locationMatch = text.match(
    /(?:Location|based in|city|Delhi|Mumbai|Bengaluru|Hyderabad|Chennai|Kolkata|Pune|Noida)/i,
  );
  if (locationMatch) {
    return locationMatch[0];
  }

  return '';
}
