const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

let testDb = null

function createTestDatabase() {
    if (testDb) {
        testDb.close()
    }
    
    // Create in-memory database for speed
    testDb = new Database(':memory:')
    
    // Enable foreign keys
    testDb.pragma('foreign_keys = ON')
    
    // Load schema
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'test-schema.sql'), 'utf8')
    const schemaStatements = schemaSQL.split(';').filter(stmt => stmt.trim())
    
    for (const stmt of schemaStatements) {
        if (stmt.trim()) {
            testDb.exec(stmt)
        }
    }
    
    // Load fixtures
    const fixturesSQL = fs.readFileSync(path.join(__dirname, 'test-fixtures.sql'), 'utf8')
    const fixtureStatements = fixturesSQL.split(';').filter(stmt => stmt.trim())
    
    for (const stmt of fixtureStatements) {
        if (stmt.trim()) {
            testDb.exec(stmt)
        }
    }
    
    return Promise.resolve(testDb)
}

function convertPostgresSQLToSQLite(sql, params) {
    // Convert PostgreSQL-specific syntax to SQLite
    let convertedSQL = sql
    
    // Convert PostgreSQL $1, $2 parameters to ? placeholders
    // In PostgreSQL, $1 can appear multiple times but references the same parameter value
    // In SQLite, each ? needs its own parameter value
    
    const convertedParams = []
    
    // Find all unique parameter numbers
    const paramMatches = convertedSQL.match(/\$\d+/g) || []
    const uniqueParamNums = [...new Set(paramMatches.map(match => parseInt(match.substring(1))))]

    const paramsThatWereArrays = {}
    
    // Create a map for parameter values by order of ? replacement
    let paramValues = []
    for (const match of paramMatches) {
        const paramNum = Number(match.substring(1))
        let paramValue = params && params[paramNum - 1] !== undefined ? params[paramNum - 1] : null
        
        // Convert Date objects to ISO strings for SQLite compatibility
        if (paramValue instanceof Date) {
            paramValue = paramValue.toISOString()
        }
        
        // Arrays need to be flattened into more params
        if (Array.isArray(paramValue)) {
            paramValues = [...paramValues, ...paramValue]
            paramsThatWereArrays[paramNum] = paramValue
        } else {
            paramValues.push(paramValue)
        }
        
    }
    
    convertedParams.push(...paramValues)

    // Convert PostgreSQL functions and syntax BEFORE replacing parameters
    convertedSQL = convertedSQL.replace(/STRING_AGG\((.*?),\s*'([^']+)'\)/g, 'GROUP_CONCAT($1, \'$2\')')
    convertedSQL = convertedSQL.replace(/LEFT\((.*?),\s*(\d+)\)/g, 'SUBSTR($1, 1, $2)')
    
    // Convert PostgreSQL casting syntax to SQLite
    convertedSQL = convertedSQL.replace(/::int\[\]/g, '')
    convertedSQL = convertedSQL.replace(/::VARCHAR/g, '')
    convertedSQL = convertedSQL.replace(/::INT/g, '')
    
    // SQLite supports RETURNING as of version 3.35.0, so we can keep it
    
    // Convert PostgreSQL ANY operator to IN
    // convertedSQL = convertedSQL.replace(/= ANY\((\$\d+)\)/g, 'IN ($1)')
    const anyMatches = convertedSQL.match(/= ANY\((\$\d+)\)/g) || []
    for (const match of anyMatches) {
        const paramNum = Number(match.match(/\d+/)[0])
        const paramValue = paramsThatWereArrays[paramNum]
        convertedSQL = convertedSQL.replace(match, `IN (${paramValue.map(() => '?').join(', ')})`)
    }
    
    // Replace all $N with ? in order (AFTER all other conversions)
    convertedSQL = convertedSQL.replace(/\$\d+/g, '?')

    // Convert PostgreSQL UPDATE...FROM to SQLite compatible syntax  
    if (convertedSQL.includes('UPDATE') && convertedSQL.includes('FROM (')) {
        // Handle UPDATE posts SET ... FROM (subquery) AS alias WHERE posts.table = value
        const match = convertedSQL.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+FROM\s+\((.*?)\)\s+AS\s+(\w+)\s+WHERE\s+(\w+)\.(\w+)\s*=\s*(.*)/s)
        if (match) {
            const [, tableName, setClause, subquery, alias, whereTable, whereColumn, whereValue] = match
            
            // Convert SET clause: replace alias.column with (subquery)
            const convertedSetClause = setClause.replace(new RegExp(`${alias}\\.(\\w+)`, 'g'), `(${subquery})`)
            
            convertedSQL = `UPDATE ${tableName} SET ${convertedSetClause} WHERE ${whereTable}.${whereColumn} = ${whereValue}`
        }
    }
    
    // Convert PostgreSQL ILIKE to SQLite LIKE with COLLATE NOCASE
    convertedSQL = convertedSQL.replace(/ILIKE/g, 'LIKE COLLATE NOCASE')
    
    // Convert NOW() to datetime('now')
    convertedSQL = convertedSQL.replace(/NOW\(\)/g, "datetime('now')")
    
    // Convert COUNT(alias.*) to COUNT(*)
    convertedSQL = convertedSQL.replace(/COUNT\(\w+\.\*\)/g, 'COUNT(*)')
    
    // Handle table name differences
    convertedSQL = convertedSQL.replace(/post_poll_votes/g, 'poll_votes')
    
    return { sql: convertedSQL, params: convertedParams }
}

async function executeQuery(sql, params) {
    const { sql: convertedSQL, params: convertedParams } = convertPostgresSQLToSQLite(sql, params)
    try {
        if (convertedSQL.trim().toUpperCase().startsWith('SELECT') || 
            convertedSQL.trim().toUpperCase().startsWith('WITH') ||
            convertedSQL.toUpperCase().includes('RETURNING')) {
            // Execute queries that return data (SELECT, WITH, or anything with RETURNING)
            const stmt = testDb.prepare(convertedSQL)
            const rows = stmt.all(...convertedParams)
            return { rows: rows || [] }
        } else {
            // Handle INSERT/UPDATE/DELETE queries without RETURNING
            const stmt = testDb.prepare(convertedSQL)
            const result = stmt.run(...convertedParams)
            return { rows: [], lastID: result.lastInsertRowid, changes: result.changes }
        }
    } catch (e) {
        console.warn(convertedSQL)
        console.warn(convertedParams)
        console.warn(e.message)
        process.exit(1)
    }
}

function getTestDatabase() {
    return testDb
}

function closeTestDatabase() {
    if (testDb) {
        testDb.close()
        testDb = null
    }
}

module.exports = {
    createTestDatabase,
    executeQuery,
    getTestDatabase,
    closeTestDatabase
}