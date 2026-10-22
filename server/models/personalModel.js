const pool = require("../config/db");

// ============================================
// CREATE personal details
// ============================================
const createPersonalDetails = async (employeeId, data) => {
    const result = await pool.query(
        `INSERT INTO employee_personal_details
        (employee_id, first_name, middle_name, last_name, gender, dob, blood_group,
         marital_status, nationality, father_name, mother_name, phone, alternate_phone,
         email, current_address, permanent_address, city, state, country, pincode,
         aadhaar_number, pan_number, passport_number, driving_license,
         qualification, college, university, passing_year, experience,
         bank_name, account_holder_name, account_number, ifsc_code, branch,
         emergency_contact_relation, emergency_contact_number,
         profile_completion, verification_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
        RETURNING *`,
        [
            employeeId,
            data.first_name || null,
            data.middle_name || null,
            data.last_name || null,
            data.gender || null,
            data.dob || null,
            data.blood_group || null,
            data.marital_status || null,
            data.nationality || null,
            data.father_name || null,
            data.mother_name || null,
            data.phone || null,
            data.alternate_phone || null,
            data.email || null,
            data.current_address || null,
            data.permanent_address || null,
            data.city || null,
            data.state || null,
            data.country || null,
            data.pincode || null,
            data.aadhaar_number || null,
            data.pan_number || null,
            data.passport_number || null,
            data.driving_license || null,
            data.qualification || null,
            data.college || null,
            data.university || null,
            data.passing_year || null,
            data.experience || null,
            data.bank_name || null,
            data.account_holder_name || null,
            data.account_number || null,
            data.ifsc_code || null,
            data.branch || null,
            data.emergency_contact_relation || null,
            data.emergency_contact_number || null,
            data.profile_completion || 0,
            "Draft",
        ]
    );

    return result.rows[0];
};

// ============================================
// UPDATE personal details
// ============================================
const updatePersonalDetails = async (employeeId, data) => {
    const fields = [
        "first_name", "middle_name", "last_name", "gender", "dob", "blood_group",
        "marital_status", "nationality", "father_name", "mother_name", "phone",
        "alternate_phone", "email", "current_address", "permanent_address",
        "city", "state", "country", "pincode", "aadhaar_number", "pan_number",
        "passport_number", "driving_license", "qualification", "college",
        "university", "passing_year", "experience", "bank_name",
        "account_holder_name", "account_number", "ifsc_code", "branch",
        "emergency_contact_relation", "emergency_contact_number",
        "profile_completion"
    ];

    const setClauses = [];
    const values = [];
    let index = 1;

    fields.forEach(field => {
        if (data[field] !== undefined) {
            setClauses.push(`${field}=$${index}`);
            values.push(data[field]);
            index++;
        }
    });

    if (setClauses.length === 0) {
        return getPersonalDetails(employeeId);
    }

    setClauses.push("updated_at=CURRENT_TIMESTAMP");
    values.push(employeeId);

    const result = await pool.query(
        `UPDATE employee_personal_details
         SET ${setClauses.join(",")}
         WHERE employee_id=$${index}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// ============================================
// GET personal details
// ============================================
const getPersonalDetails = async (employeeId) => {
    const result = await pool.query(
        `SELECT epd.*,e.employee_id AS emp_code,e.designation,e.hire_date,
                d.department_name
         FROM employee_personal_details epd
         JOIN employees e ON epd.employee_id=e.id
         LEFT JOIN departments d ON d.id=e.department_id
         WHERE epd.employee_id=$1`,
        [employeeId]
    );

    return result.rows[0] || null;
};

// ============================================
// UPSERT documents
// ============================================
const upsertDocuments = async (employeeId, files) => {

    const existing = await pool.query(
        "SELECT id FROM employee_documents WHERE employee_id=$1",
        [employeeId]
    );

    const fileFields = {};

    if (files.passport_photo) fileFields.passport_photo = files.passport_photo[0].filename;
    if (files.aadhaar_file) fileFields.aadhaar_file = files.aadhaar_file[0].filename;
    if (files.pan_file) fileFields.pan_file = files.pan_file[0].filename;
    if (files.address_proof) fileFields.address_proof = files.address_proof[0].filename;
    if (files.qualification_certificate) fileFields.qualification_certificate = files.qualification_certificate[0].filename;
    if (files.bank_passbook) fileFields.bank_passbook = files.bank_passbook[0].filename;
    if (files.other_document) fileFields.other_document = files.other_document[0].filename;

    if (existing.rows.length > 0) {

        const setClauses = [];
        const values = [];
        let i = 1;

        Object.entries(fileFields).forEach(([key, val]) => {
            setClauses.push(`${key}=$${i}`);
            values.push(val);
            i++;
        });

        if (setClauses.length === 0) {
            return existing.rows[0];
        }

        setClauses.push("updated_at=CURRENT_TIMESTAMP");
        values.push(employeeId);

        const result = await pool.query(
            `UPDATE employee_documents
             SET ${setClauses.join(",")}
             WHERE employee_id=$${i}
             RETURNING *`,
            values
        );

        return result.rows[0];

    } else {

        const columns = ["employee_id", ...Object.keys(fileFields)];
        const vals = [employeeId, ...Object.values(fileFields)];
        const placeholders = vals.map((_, i) => `$${i + 1}`);

        const result = await pool.query(
            `INSERT INTO employee_documents
            (${columns.join(",")})
            VALUES(${placeholders.join(",")})
            RETURNING *`,
            vals
        );

        return result.rows[0];
    }
};

// ============================================
// GET documents
// ============================================
const getDocuments = async (employeeId) => {
    const result = await pool.query(
        "SELECT * FROM employee_documents WHERE employee_id=$1",
        [employeeId]
    );

    return result.rows[0] || null;
};

// ============================================
// SUBMIT FOR VERIFICATION
// ============================================
const submitForVerification = async (employeeId) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const update = await client.query(
            `UPDATE employee_personal_details
             SET verification_status='Pending',
                 updated_at=CURRENT_TIMESTAMP
             WHERE employee_id=$1
             RETURNING *`,
            [employeeId]
        );

        if (update.rows.length === 0) {
            throw new Error("Personal details not found");
        }

        const existingLog = await client.query(
            `SELECT id
             FROM personal_verification_logs
             WHERE employee_id=$1`,
            [employeeId]
        );

        if (existingLog.rows.length === 0) {

            await client.query(
                `INSERT INTO personal_verification_logs
                (employee_id,status,remarks)
                VALUES($1,'Pending','Submitted by Employee')`,
                [employeeId]
            );

        } else {

            await client.query(
                `UPDATE personal_verification_logs
                 SET status='Pending',
                     remarks='Resubmitted by Employee',
                     created_at=CURRENT_TIMESTAMP
                 WHERE employee_id=$1`,
                [employeeId]
            );

        }

        await client.query("COMMIT");

        return update.rows[0];

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }

};

module.exports = {
    createPersonalDetails,
    updatePersonalDetails,
    getPersonalDetails,
    upsertDocuments,
    getDocuments,
    submitForVerification,
};
