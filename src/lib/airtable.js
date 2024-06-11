import Airtable from "airtable";

// set the api key
const base = new Airtable({ 
    apiKey: process.env.PLUGINS_AIRTABLE_API_KEY,
}).base(process.env.PLUGINS_AIRTABLE_BASE_ID);

export function getSubcribedApps() {
    const records = [];
    base("Update Listeners").select({
        maxRecords: 100,
        view: "Grid view"
    }).eachPage((records, nextPage) => {
        // adding all records to the records list
        records.forEach(record => {
            records.push({ app: record.get("App"), endpoint: record.get("Endpoint"), status: record.get("Status") });
        });

        // get the next set of records
        nextPage();
    }).catch(err => {
        throw err;
    });
    return records;
}