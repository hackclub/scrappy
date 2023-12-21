import { v4 as uuidv4 } from "uuid";

// returns the urls that are in the text
export function getUrls(text) {
  const matcher = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()'@:%_\+.~#?!&//=]*)/gi;
  return text.match(matcher);
}

export function extractOgUrl(htmlDoc) {
  const result = RegExp("og:image").exec(htmlDoc);

  if (!result) return;

  let index = result.index;
  for(;;) {
    if (htmlDoc[index] === "/" && htmlDoc[index+1] === ">") break;
    if (htmlDoc[index] === ">") break;
    index++;
  }

  const ogExtract = htmlDoc.slice(result.index, index);
  const ogUrlString = ogExtract.split("content=")[1].trim();
  return ogUrlString.slice(1, -1);
}

export async function getPageContent(page) {
  const response = await fetch(page);
  const content = await response.text();
  return content;
}

export async function getAndUploadOgImage(url) {
  const file = await fetch(url);
  let blob = await file.blob();
  const form = new FormData();
  form.append("file", blob, `${uuidv4()}.png`);

  const response = await fetch("https://bucky.hackclub.com", {
    method: "POST",
    body: form
  });

  const responseContent = await response.text();
  return responseContent;
}