export function getExpectedContentText(content: string | undefined) {
  return (content ?? "")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*|```/gi, ""))
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
