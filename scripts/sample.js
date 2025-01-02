async function getPageContent(url) {
    const response = await fetch(url);
    const content = await response.text();
    return content;
}

export function extractOgUrl(htmlDoc) {
  const result = RegExp("\"og:image\"").exec(htmlDoc);

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

// const page = "https://github.com/ShreyaSirgound/Inventory-Tracker";
// const page = "https://harshutammina.tech/projects-portfolio/"
// const page = "https://cad.onshape.com/documents/0e8ddce26482a82d51c0894c/w/749a4c3a17907217f320f2f";
const page = "https://github.com/sayhan1610/portfolio";
async function main() {
    const pageContent = await getPageContent(page);
    const ogUrls = extractOgUrl(pageContent)
    console.log(ogUrls);
}

main();