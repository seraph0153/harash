
const SPREADSHEET_ID = '10LSlQ8cj944t3wEZ34fILJMJiz9_takPNFVCK4h0yDM';
const SHEET_NAME = 'Sheet2';
const URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

async function run() {
    console.log('Fetching:', URL);
    const resp = await fetch(URL);
    const text = await resp.text();

    // Remove wrapper
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);

    const rows = data.table.rows;
    console.log('Total Rows:', rows.length);

    // Print Row 0, 20, 360
    [0, 20, 360, 364].forEach(idx => {
        if (rows[idx]) {
            const row = rows[idx];
            const cells = row.c;
            const parsed = cells.map(c => c ? (c.v !== undefined ? c.v : c.f) : null);
            console.log(`Row ${idx}:`, parsed);
        } else {
            console.log(`Row ${idx}: undefined`);
        }
    });
}

run().catch(console.error);
