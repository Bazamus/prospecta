// Parsea el campo ReviewsText (XML de Google Maps) y devuelve texto plano
// para enviarlo como contexto adicional a Claude API durante el scoring.
//
// Formato esperado:
// <reviews>
//   <review>
//     <user>Nombre usuario</user>
//     <stars>5</stars>
//     <userComment>Texto de la reseña...</userComment>
//   </review>
// </reviews>

interface ParsedReview {
  stars: number
  comment: string
}

export function parseReviewsXml(xml: string): string {
  if (!xml || xml.trim() === "" || xml === "undefined") return ""

  const reviews: ParsedReview[] = []

  // Extraer cada bloque <review>
  const reviewBlocks = [...xml.matchAll(/<review>([\s\S]*?)<\/review>/g)]

  for (const block of reviewBlocks) {
    const content = block[1]

    const starsMatch = content.match(/<stars>([\s\S]*?)<\/stars>/)
    const commentMatch = content.match(/<userComment>([\s\S]*?)<\/userComment>/)

    const stars = starsMatch ? parseInt(starsMatch[1].trim(), 10) : 0
    const comment = commentMatch ? commentMatch[1].trim() : ""

    if (comment) {
      reviews.push({ stars, comment })
    }
  }

  if (reviews.length === 0) return ""

  // Limitar a 10 reseñas para no exceder el contexto de Claude
  const limited = reviews.slice(0, 10)

  // Formato: "★5: Texto de la reseña | ★4: Otra reseña..."
  return limited
    .map((r) => `★${r.stars}: ${r.comment}`)
    .join(" | ")
}
