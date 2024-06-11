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