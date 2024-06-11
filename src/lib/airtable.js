import Airtable from "airtable";
import { config } from "dotenv";

// load environment variables
config();

console.log("airtable plugins api key", process.env.PLUGINS_AIRTABLE_API_KEY)
console.log("airtbale plugins base id ", process.env.PLUGINS_AIRTABLE_BASE_ID)

// set the api key
export const base = new Airtable({ 
    apiKey: process.env.PLUGINS_AIRTABLE_API_KEY,
}).base(process.env.PLUGINS_AIRTABLE_BASE_ID);

export function getSubcribedApps() {
    const records = [];
    base("Update Listeners").select({
        maxRecords: 100,
        view: "Grid view"
    }).eachPage((airtableRecords, nextPage) => {
        // adding all records to the records list
        airtableRecords.forEach(record => {
            records.push({ app: record.get("App"), endpoint: record.get("Endpoint"), status: record.get("Status") });
        });

        // get the next set of records
        nextPage();
    }, (err) => {
        if (err) throw err
    });
    return records;
}