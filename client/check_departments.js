require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDepts() {
    console.log("Checking departments table...");
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error fetching departments:", error);
    } else {
        console.log("Departments found:", data.length);
        console.table(data);
    }
}

checkDepts();
