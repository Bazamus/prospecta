// Parsea el campo ReviewsText (XML) y devuelve texto plano concatenado
// para enviarlo como contexto adicional a Claude API durante el scoring

export function parseReviewsXml(xml: string): string {
  if (!xml || xml.trim() === "") return ""

  // TODO: implementar en Fase 1 con un parser XML real (DOMParser en cliente o fast-xml-parser en servidor)
  // Formato esperado:
  // <reviews>
  //   <review>
  //     <user>Nombre</user>
  //     <stars>5</stars>
  //     <userComment>Texto de la reseña</userComment>
  //   </review>
  // </reviews>

  // Extracción básica con regex como fallback
  const comments = [...xml.matchAll(/<userComment>([\s\S]*?)<\/userComment>/g)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 10) // máximo 10 reseñas para no exceder el contexto de Claude

  return comments.join(" | ")
}
