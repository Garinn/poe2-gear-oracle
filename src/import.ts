import { inflateSync } from "node:zlib";
import { XMLValidator, XMLParser } from "fast-xml-parser";
const MAX = 2_000_000;
export function importBuild(input: string): string {
  let xml = input.trim();
  if (!xml || xml.length > MAX)
    throw Error("Provide a PoB2 XML or share code smaller than 2 MB.");
  if (/^https?:/.test(xml))
    throw Error(
      "Open the link in PoB2 and paste its export code here. V1 does not fetch URLs.",
    );
  if (xml.startsWith("{"))
    throw Error(
      ".build/character JSON is not a complete PoB calculation state. Import into PoB2 first and export a share code or XML.",
    );
  if (!xml.startsWith("<")) {
    if (!/^[A-Za-z0-9_+\/=-]+$/.test(xml))
      throw Error("Invalid PoB share code.");
    try {
      xml = inflateSync(Buffer.from(xml, "base64url"), {
        maxOutputLength: MAX,
      }).toString("utf8");
    } catch {
      throw Error(
        "Could not decode PoB share code. Paste the entire code or use the saved XML.",
      );
    }
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("XML entities and document types are not supported.");
  if (XMLValidator.validate(xml) !== true) throw Error("Malformed build XML.");
  const doc = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(xml);
  if (!doc.PathOfBuilding2?.Build)
    throw Error(
      "Expected a PathOfBuilding2 export, not PoB1 or an in-game .build file.",
    );
  if (
    !doc.PathOfBuilding2.Skills ||
    !doc.PathOfBuilding2.Items ||
    !doc.PathOfBuilding2.Tree
  )
    throw Error("Build must contain skills, equipment and a passive tree.");
  return xml;
}
