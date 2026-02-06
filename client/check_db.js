require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY not found in client/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    const tables = ['profiles', 'teams', 'sub_teams', 'tasks', 'departments'];

    console.log(`Checking project: ${supabaseUrl}`);

    for (const table of tables) {
        console.log(`\n--- Testing [${table}] ---`);
        let query = supabase.from(table).select('*');

        if (table === 'profiles' || table === 'teams' || table === 'sub_teams' || table === 'tasks') {
            const orderBy = (table === 'profiles') ? 'name' : 'created_at';
            console.log(`Ordering by: ${orderBy}`);
            query = query.order(orderBy, { ascending: true });
        }

        const { data, error, status } = await query.limit(5);

        if (error) {
            console.error(`Status ${status}, Error: ${error.message} (${error.code})`);
            if (error.details) console.error(`Details: ${error.details}`);
            if (error.hint) console.error(`Hint: ${error.hint}`);
        } else {
            console.log(`SUCCESS (Status ${status}). Rows found: ${data.length}`);
            if (data.length > 0) {
                console.log(`First row columns: ${Object.keys(data[0]).join(', ')}`);
            } else {
                console.log('Table is empty.');
            }
        }
    }
}

checkTables();
