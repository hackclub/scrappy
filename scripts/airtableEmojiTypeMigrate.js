const AirtablePlus = require("airtable-plus");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

let prisma = new PrismaClient();

const airtable = new AirtablePlus({
  baseID: "appRxhF9qVMLbxAXR",
  apiKey: process.env.AIRTABLE_KEY,
  tableName: "Emoji Type",
})(async () => {
  console.log("running!");
  const read = await airtable.read();
  console.log("read!");
  const createMany = await prisma.emojiType.createMany({
    data: read.map((x) => ({
      name: x.fields["Name"],
      emojiSource: x.fields["Emoji Source"],
    })),
    skipDuplicates: true,
  });
  console.log("written!");
})();
