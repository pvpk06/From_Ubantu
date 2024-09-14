const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const env = require('dotenv');
const multer = require('multer');
const util = require('util');

const nodemailer = require('nodemailer');
const pool = require('./db');
const { check, validationResult } = require('express-validator');
const app = express();

env.config();
const PORT = process.env.PORT ||  5000;
const upload = multer({ storage: multer.memoryStorage() });
app.use(bodyParser.json());
app.use(cors());
var server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
var io = require('socket.io')(server, { cors: { origin: '*' } });
const query = util.promisify(pool.query).bind(pool);
/*
const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
};*/

const sendEmail = async (email, mailOptions) => {
  const transport = nodemailer.createTransport({
    host: "smtp.zeptomail.in",
    port: 587,
    auth: {
      user: "emailapikey",
      pass: "PHtE6r0KFrvujWMnoBQI4fCwFMPyNIgv9LxjKlMVttxGW/BSGk0EqtwolWOzohcrVfBGE/Oayt9ot+jP4LiMc2bvMz1NW2qyqK3sx/VYSPOZsbq6x00Zsl4ddETZXYDmdtJp0C3fvtjaNA=="
    }
  });

  const options = {
    to: email,
    from: '"React Team" <noreply@qtnext.com>',
    ...mailOptions
  };
  console.log("email", options)

  try {
    await transport.sendMail(options);
    console.log("Email sent successfully");
    return { status: 200, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { status: 500, message: 'Error sending email' };
  }
};

//HR api to get jobs in a company posted by same HR

app.get('/hr-job-applications', async (req, res) => {
  const { companyName, hrId } = req.query;
  console.log("Company name", companyName, hrId)
  let sql;
  if (companyName == '' || companyName === undefined) {
    sql = `SELECT applied_students.*,
    J.JobId,
    J.postedBy
 FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId WHERE J.postedBy = '${hrId}'`;
  } else {
    sql = `SELECT applied_students.*,
    J.JobId,
    J.postedBy FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId where applied_students.companyName='${companyName}' and J.postedBy='${hrId}'`;
  }
  //console.log("got  here")

  console.log(sql)
  try {
    const rows = await query(sql);

    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));

    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.put("/applications/:id/status", async (req, res) => {
  const { status } = req.body
  const { id } = req.params
  console.log(status, id)
  try {
    const result = await query('UPDATE applied_students SET status=? WHERE applicationID=?', [status, id])
    console.log(result)
    res.status(200).json({ message: "Status Changed Successfully" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server Error" })
  }
})

//Intern job apply api
app.post('/apply-job', upload.single('resume'), async (req, res) => {
  
  const { fullName, jobId, candidateId, jobRole, email, companyName, technology, mobileNumber, gender, yearOfPassedOut, experience } = req.body;
  const resume = req.file ? req.file.buffer : null;
  const status = "applied";

  try {
    const existingApplication = await query(
      'SELECT * FROM applied_students WHERE jobID = ? AND candidateID = ?',
      [jobId, candidateId]
    );
    if (existingApplication.length > 0) {
      return res.status(409).json({ message: 'Application already submitted' });
    }
    await query(
      'INSERT INTO applied_students (jobID, fullName, candidateID, jobRole, email, companyName, technology, mobileNo, gender, passedOut, experience, status, resume, applied_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [jobId, fullName, candidateId, jobRole , email, companyName, technology, mobileNumber, gender, yearOfPassedOut, experience, status, resume]
    );
    console.log("Applied successfully");
    res.status(200).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});



//Resume download
app.get('/download-resume/:id', async (req, res) => {
  const { id } = req.params;
  console.log(req.params)
  console.log(id)
  try {
    const rows = await query('SELECT resume FROM applied_students WHERE applicationID = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const resume = rows[0].resume;
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(resume);
  } catch (err) {
    console.error('Error fetching resume:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});



//statistics for super admin
app.get('/statistics/:status', async (req, res) => {
  const { status } = req.params
  console.log(status);
  try {
    let result;
    if (status === 'applied') {
      [result] = await query('SELECT COUNT(*) as count FROM applied_students;')

    }
    else {
      [result] = await query(`SELECT COUNT(*) as count FROM applied_students WHERE status='${status}'`)
    }
    console.log(result.count)

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
})


/*
//Job descriptions and job applications for superadmin 
app.get('/applications/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const sql = `SELECT * FROM applied_students where jobId='${jobId}'`;
  try {
    const rows = await query(sql);
    const response = rows.map(row => ({
      ...row,
    }));

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});*/
 

app.get('/applications/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const sql = `SELECT * FROM applied_students where jobId='${jobId}'`;
  //console.log("got  here")
  console.log(sql);
  try {
    const rows = await query(sql);
    console.log(rows);
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));

    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//intern registration

app.post('/register/intern', async (req, res) => {
  const { fullName, email, mobileno, altmobileno, address, batchno, modeOfInternship, belongedToVasaviFoundation, domain } = req.body;

  const emailGot = req.body.email;
  try {
    const data1 = await query('SELECT email FROM intern_data WHERE email = ?', [email]);
    if (data1.length > 0) {
      return res.status(400).json({
        message: 'Email already exists',
        suggestion: 'Please use a different email address or contact admin if you believe this is an error.'
      });
    }
    const data2 = await query('SELECT email FROM intern_requests WHERE email = ?', [email]);
    if (data2.length > 0) {
      return res.status(401).json({
        message: 'Already registered, Wait for approval',
      });
    } else {
      const sql = 'INSERT INTO intern_requests (fullName, email, mobileNo, altMobileNo, address, batchno, modeOfInternship, belongedToVasaviFoundation, domain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

      try {
        await query(sql, [fullName, email, mobileno, altmobileno, address, batchno, modeOfInternship, belongedToVasaviFoundation, domain]);

        const mail = emailGot;
        const mailOptions = {
          subject: 'Registration Success',
          html: `    <p style="font-family: Arial, sans-serif; color: #333333;">
      Successfully registered at <strong>RamanaSoft IT Services</strong>.</p> <br> <p>Below are the details we got from you </p>  <br> <strong>FUll Name </strong> : ${req.body.fullName} <br. Email : ${req.body.email} <br> mobile : ${req.body.mobileno} <br> domain : ${req.body.domain} <br> batch : ${req.body.batchno} <br>                 
                Registration request sent to Admin <br> Waiting for his Approval. <br> An email will be sent to the registered email once approved.` ,
        };
        sendEmail(mail, mailOptions).then(response => {
          console.log(response.message);
        });
        console.log("Registered successfully");
        return res.status(200).json({ message: 'Candidate registered successfully' });
      } catch (err) {
        console.error('Error executing query:', err);
        console.log("Failed to register candidate");
        return res.status(500).json({ message: 'Failed to register candidate' });
      }
    }
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// HR registration
app.post('/register/hr', async (req, res) => {
  const {
    fullName, email, contactNo, dob, address,
    workEmail, workMobile, emergencyContactName,
    emergencyContactAddress, emergencyContactMobile,
    gender, branch
  } = req.body;

  console.log(req.body);

  function formatDateForDB(dateStr) {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(year, month - 1, day); // month is 0-based
    return date.toISOString().split('T')[0]; // "YYYY-MM-DD" format
  }

  if (!fullName || !email || !contactNo || !dob || !address || !workEmail || !workMobile || !emergencyContactName || !emergencyContactAddress || !emergencyContactMobile || !gender || !branch) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Convert the date of birth to the required format
  const dobFormatted = formatDateForDB(dob);

  try {
    // Check if email already exists in hr_data or hr_requests tables
    const existingHrData = await query('SELECT email FROM hr_data WHERE email = ?', [email]);
    if (existingHrData.length > 0) {
      return res.status(400).json({
        message: 'Email already exists in HR data',
        suggestion: 'Please use a different email address or contact admin if you believe this is an error.'
      });
    }

    const existingHrRequests = await query('SELECT email FROM hr_requests WHERE email = ?', [email]);
    if (existingHrRequests.length > 0) {
      return res.status(401).json({
        message: 'Already registered, wait for approval',
      });
    }

    // Insert new HR request
    const sql = `INSERT INTO hr_requests (
      fullName, email, contactNo, dob, address, workEmail, workMobile,
      emergencyContactName, emergencyContactAddress, emergencyContactMobile, gender, branch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await query(sql, [
      fullName, email, contactNo, dobFormatted, address, workEmail, workMobile,
      emergencyContactName, emergencyContactAddress, emergencyContactMobile, gender, branch
    ]);

    res.status(200).json({ message: 'HR registration successful' });

  } catch (err) {
    console.error('Error inserting data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/update-profile/:id', async (req, res) => {
  const internID = req.params.id;


})

//Superadmin api to add hr
app.post('/add/hr', async (req, res) => {
  const {
    fullName, email, contactNo, dob, address,
    workEmail, workMobile, emergencyContactName,
    emergencyContactAddress, emergencyContactMobile,
    gender, branch, password
  } = req.body;
  console.log(req.body);
  if (!fullName || !email || !contactNo || !dob || !address || !workEmail || !workMobile || !emergencyContactName || !emergencyContactAddress || !emergencyContactMobile || !gender || !branch || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const lastHRQuery = 'SELECT HRid FROM hr_data ORDER BY HRid DESC LIMIT 1';
  const lastHRResult = await query(lastHRQuery);

  if (lastHRResult === undefined) {
    console.error('Error fetching last HR:', lastHRResult);
    return res.status(500).json({ error: 'Failed to fetch last HR' });
  }

  const lastHR = lastHRResult.length > 0 ? lastHRResult[0] : null;
  let lastHRIdNumber = lastHR ? parseInt(lastHR.HRid.split('-')[1]) : 0;
  lastHRIdNumber++;
  const newHRId = `RSHR-${String(lastHRIdNumber).padStart(2, '0')}`;

  const sql = `INSERT INTO hr_data (
    HRid, fullName, email, mobileNo, dob, address, workEmail, workMobile,
    emergencyContactName, emergencyContactAddress, emergencyContactMobile, gender, branch, password
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    await query(sql, [
      newHRId, fullName, email, contactNo, dob, address, workEmail, workMobile,
      emergencyContactName, emergencyContactAddress, emergencyContactMobile, gender, branch, password
    ]);

    res.status(200).json({ message: 'HR registration successful' });
  } catch (err) {
    console.log(err);
    console.error('Error inserting data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//SA api for hr requests
app.get("/hr-requests", async (req, res) => {
  try {
    const hr = await query('SELECT * FROM hr_requests');
    res.status(200).json(hr);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//HR panel statistics API
app.get('/hr-statistics/', async (req, res) => {
  const { status, hrId } = req.query
  console.log("Status", status, hrId)
  try {
    let result;
    if (status === 'applied') {
      [result] = await query(`SELECT COUNT(*) as count FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId WHERE J.postedBy = '${hrId}'`)

    }
    else {
      [result] = await query(`SELECT COUNT(*) as count
FROM applied_students
JOIN jobs AS J ON applied_students.JobID = J.JobId
WHERE J.postedBy = '${hrId}' AND applied_students.status = '${status}'`)
    }
    //console.log(result.count)
    console.log("Hr", status, result)
    res.status(200).json(result); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
})

//HR panel statistics api for HR leads
app.get('/hr-job-statistics/', async (req, res) => {
  const { status, hrId } = req.query
  console.log("API called")
  try {
    let result;
    if (status === 'hr-leads') {
      [result] = await query('SELECT COUNT(*) as count FROM companies;')
    }
    else if (status === 'all-jobs') {
      [result] = await query(`SELECT COUNT(*) as count FROM jobs where postedby='${hrId}';`)
    }
    else {
      [result] = await query(`SELECT COUNT(*) as count FROM jobs WHERE status='${status}' AND postedby='${hrId}'`)
    }
    console.log("Status:", status, result.count)

    res.status(200).json(result); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
})

//Super admin  api to accept hr request
app.post("/accept-hrs", async (req, res) => {
  const hrs = req.body;
  console.log('Received HRs:', hrs);
  if (!Array.isArray(hrs)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  const acceptedHRs = [];
  const rejectedHRs = [];
  try {
    const existingHRsQuery = 'SELECT email, mobileNo FROM hr_data WHERE email IN (?) OR mobileNo IN (?)';
    const existingHRsResult = await query(existingHRsQuery, [
      hrs.map(hr => hr.email),
      hrs.map(hr => hr.mobileNo)
    ]);
    if (existingHRsResult === undefined) {
      console.error('Error fetching existing HRs:', existingHRsResult);
      return res.status(500).json({ error: 'Failed to fetch existing HRs' });
    }
    const existingHRs = existingHRsResult || [];
    const existingEmails = new Set(existingHRs.map(hr => hr.email));
    const existingPhones = new Set(existingHRs.map(hr => hr.mobileNo));

    const lastHRQuery = 'SELECT HRid FROM hr_data ORDER BY HRid DESC LIMIT 1';
    const lastHRResult = await query(lastHRQuery);

    if (lastHRResult === undefined) {
      console.error('Error fetching last HR:', lastHRResult);
      return res.status(500).json({ error: 'Failed to fetch last HR' });
    }

    const lastHR = lastHRResult.length > 0 ? lastHRResult[0] : null;
    let lastHRIdNumber = lastHR ? parseInt(lastHR.HRid.split('-')[1]) : 0;

    for (const hr of hrs) {
      if (existingEmails.has(hr.email) || existingPhones.has(hr.mobileNo)) {
        rejectedHRs.push(hr);
      } else {
        lastHRIdNumber++;
        const newHRId = `RSHR-${String(lastHRIdNumber).padStart(2, '0')}`;
        const password = "password123";
        await query('INSERT INTO hr_data (HRid, fullName, email, mobileNo, dob, address, workEmail, workMobile, emergencyContactName, emergencyContactAddress, emergencyContactMobile, gender, branch, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          newHRId,
          hr.fullName,
          hr.email,
          hr.contactNo,
          hr.dob,
          hr.address,
          hr.workEmail,
          hr.workMobile,
          hr.emergencyContactName,
          hr.emergencyContactAddress,
          hr.emergencyContactMobile,
          hr.gender,
          hr.branch,
          password
        ]);
        acceptedHRs.push({ ...hr, HRid: newHRId });
      }
    }
    const processedHRs = [...acceptedHRs];
    if (processedHRs.length > 0) {
      await query('DELETE FROM hr_requests WHERE email IN (?)', [
        processedHRs.map(hr => hr.email),
      ]);
    }

    const mailOptions = {
      subject: 'Registration Success',
      text: `Your request is approved`,
    };
    const emailPromises = acceptedHRs.map(hr => sendEmail(hr.email, mailOptions));
    await Promise.all(emailPromises);

    res.status(200).json({ accepted: acceptedHRs, rejected: rejectedHRs });
  } catch (error) {
    console.error('Error processing HRs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//HR login api
app.post("/reject-hrs", async (req, res) => {
  const hrs = req.body;
  console.log('Received candidates:', hrs);
  const requestIDs = hrs.map(hr => hr.requestID).filter(id => id != null);
  if (requestIDs.length === 0) {
    return res.status(400).json({ message: 'No valid hrs provided' });
  }

  const placeholders = requestIDs.map(() => '?').join(',');
  const sqlQuery = `DELETE FROM hr_requests WHERE requestID IN (${placeholders})`;

  try {
    const result = await query(sqlQuery, requestIDs);
    console.log("rejected successfully !")
    if (result.affectedRows === requestIDs.length) {
      res.status(200).json({ message: 'All hrs rejected successfully' });
    } else if (result.affectedRows > 0) {
      res.status(200).json({ message: `Rejected ${result.affectedRows} out of ${requestIDs.length} interns` });
    } else {
      res.status(500).json({ message: 'No documents matched the query' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});



app.post('/api/hr-login', [
  check('email', 'Email is required').isEmail(),
  check('password', 'Password is required').not().isEmpty()
], async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  // Validate input
  const errors = validationResult(req);
  console.log("Errors", errors);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if the email exists
    const emailExists = await query('SELECT * FROM hr_data WHERE email = ?', [email]);
    if (emailExists.length < 1) {
      return res.status(404).json({ message: 'User Not Found' }); // 404 for not found
    }

    // Check if the email and password match
    const row = await query('SELECT * FROM hr_data WHERE email = ? AND password = ?', [email, password]);
    console.log(row);
    if (row.length > 0) {
      const user = row[0];
      console.log(user.fullName, "Logged in successfully");
      return res.status(200).json({ message: 'Logged in successfully', HRid: user.HRid }); // 200 for success
    } else {
      return res.status(401).json({ message: 'Invalid credentials' }); // 401 for unauthorized
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ message: 'Server error' }); // 500 for server error
  }
});


//Super admin api to delete hr
app.delete('/api/delete_hr/:id', async (req, res) => {
  const hrId = req.params.id;

  try {
    const result = await query('DELETE FROM hr_data WHERE HRid = ?', [hrId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'HR record not found' });
    }

    res.status(200).json({ message: 'HR record deleted successfully' });
  } catch (error) {
    console.error('Error deleting HR record:', error);
    res.status(500).json({ error: 'Failed to delete HR record' });
  }
});

// SuperAdmin Login
app.post('/SAlogin', [
  check('username', 'Username is required').not().isEmpty(),
  check('password', 'Password is required').not().isEmpty()
], async (req, res) => {
  const { username, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const rows = await query('SELECT * FROM superadmin WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      const user = rows[0];
      console.log(user.name, "Logged in successfully");
      res.status(200).json({ message: 'Logged in successfully', name: user.name, SAid: user.SAid });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




app.post("/post-job", async (req, res) => {
  const { job, hrId, companyId } = req.body;
  console.log(req.body);
  try {
    // Convert lastDate to the proper format (YYYY-MM-DD)
    const lastDate = new Date(job.lastDate).toISOString().slice(0, 10); // This will format the date as YYYY-MM-DD

    // Check for duplicate job entries
    const rows = await query(`
  SELECT * FROM jobs WHERE companyName = ? AND Location = ? AND jobCategory = ? AND jobExperience = ? AND jobQualification = ? AND email = ? AND phone = ? AND lastDate = ? AND jobDescription = ? AND salary = ? AND applicationUrl = ? AND requiredSkills = ? AND jobType = ? AND jobTitle = ? AND postedBy = ?`,
      [
        job.companyName, job.jobCity, job.jobCategory,
        job.jobExperience, job.jobQualification, job.email, job.phone, lastDate,
        job.jobDescription, job.salary, job.applicationUrl,
        job.requiredSkills, job.jobType, job.jobTitle, hrId
      ]);

    if (rows.length > 0) {
      return res.status(400).json({ message: 'Duplicate job entry detected, job not posted.' });
    }

    // Insert the job into the database
    await query(`
  INSERT INTO jobs (companyName, Location, jobCategory, jobExperience, jobQualification, email, phone, postedOn, lastDate, jobDescription, salary, applicationUrl, requiredSkills, jobType, jobTitle, postedBy,status,companyID, openings, bond)
  VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?,'jd-received',?, ?, ?)`,
      [
        job.companyName, job.jobCity, job.jobCategory,
        job.jobExperience, job.jobQualification, job.email, job.phone, lastDate,
        job.jobDescription, job.salary, job.applicationUrl,
        job.requiredSkills, job.jobType, job.jobTitle, hrId, companyId, job.openings, job.bond
      ]);

    res.status(201).json({ message: 'Job posted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//Updating existing posted job data for SA and HR
app.post("/update-job", async (req, res) => {
  const { jobId, changedValues } = req.body;
  console.log(jobId);
  console.log(changedValues);
  console.log("req:", req.body);

  try {
    const setPart = Object.keys(changedValues)
      .map(key => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(changedValues), jobId];

    const result = await query(
      `UPDATE jobs SET ${setPart} WHERE jobId = ?`,
      values
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: 'Job updated successfully' });
    } else {
      return res.status(400).json({ error: "Job not updated" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//intern requests for both SA and HR
app.get("/intern-requests", async (req, res) => {
  try {
    const intern = await query('SELECT * FROM intern_requests');
    io.emit('internRequestsUpdate', intern);
    res.status(200).json(intern);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }

});

//View companies for both HR and SA
app.get("/view-companies", async (req, res) => {
  try {
    const jobs = await query('SELECT * FROM companies');
    console.log("Jobs", jobs)
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//Super admin view jobs
app.get("/view-jobs", async (req, res) => {
  console.log("called")
  try {
    const jobs = await query('SELECT * FROM jobs');
    console.log(jobs)
    res.status(200).json(jobs);
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Server error" });
  }
});

//View jobs for Intern
app.get("/intern-view-jobs/:id", async (req, res) => {
  const candidateId = req.params.id;
  try {
    const date = new Date();
    const jobs = await query(`
      SELECT * FROM jobs 
      WHERE lastDate > ? 
      AND jobId NOT IN (
        SELECT jobID FROM applied_students WHERE candidateID = ?
      )
    `, [date, candidateId]);
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


//Api for view job applications for Interns
app.get('/applied-jobs/:id', async (req, res) => {
  try {
    const candidateID = req.params.id;
    const data = await query("SELECT * FROM applied_students WHERE candidateID = ?", [candidateID]);
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Intern login api
app.post("/intern_login", [
  check('mobileNo', 'Mobile number is required').not().isEmpty()
], async (req, res) => {
  const { mobileNo } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if the intern exists with the provided mobile number
    const rows = await query('SELECT * FROM intern_data WHERE mobileNo = ?', [mobileNo]);
    console.log(rows);
    if (rows.length > 0) {
      const intern = rows[0];
      console.log(intern);
      res.cookie('internID', intern.candidateID, { httpOnly: true, secure: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ message: 'Please Login', intern }); // 200 for success
    } else {
      return res.status(404).json({ error: "Intern not found, please register" }); // Updated to 404 for "Intern not found"
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' }); // 500 for "Server error"
  }
});


//Students list in SA 
app.get("/intern_data", async (req, res) => {
  try {
    const rows = await query('SELECT * FROM intern_data order by candidateID desc');
    res.status(200).json(rows);
  } catch (err) {
    console.error("Database query error: ", err);
    res.status(500).json({ message: "Server error" });
  }
});

//Student profile for SA && Intern Profile
app.get("/intern_data/:id", async (req, res) => {
  const internID = req.params.id;
  try {
    const rows = await query('SELECT * FROM intern_data WHERE candidateID = ?', [internID]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Database query error: ", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.put('/intern_data/:candidateID', async (req, res) => {
  const { candidateID } = req.params;
  const { fullName, email, mobileNo, altMobileNo, domain, belongedToVasaviFoundation, address, batchNo, modeOfInternship } = req.body;

  try {
    // Check if the provided data already exists for a different candidateID
    const checkQuery = `
      SELECT * FROM intern_data 
      WHERE (email = '${email}' OR mobileNo = '${mobileNo}') AND candidateID != '${candidateID}';
    `;
    console.log("checkQuery :", checkQuery);
    const existingRows = await query(checkQuery);
    console.log(existingRows);
    if (existingRows.length > 0) {
      return res.status(401).json({
        message: 'Data already exists',
        suggestion: 'Please use a different email address or mobile number, or contact admin if you believe this is an error.'
      });
    }

    // If no duplicates are found, proceed with the update
    const updateQuery = `
      UPDATE intern_data
      SET
        fullName = ?,
        email = ?,
        mobileNo = ?,
        altMobileNo = ?,
        domain = ?,
        belongedToVasaviFoundation = ?,
        address = ?,
        batchNo = ?,
        modeOfInternship = ?
      WHERE candidateID = ?;
    `;

    await query(updateQuery, [fullName, email, mobileNo, altMobileNo, domain, belongedToVasaviFoundation, address, batchNo, modeOfInternship, candidateID]);

    return res.status(200).json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// DELETE a student by candidateID
app.delete("/intern_data/:id", async (req, res) => {
  const internID = req.params.id;
  try {
    const result = await query('DELETE FROM intern_data WHERE candidateID = ?', [internID]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Student data deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Student not found.' });
    }
  } catch (err) {
    console.error("Database query error: ", err);
    res.status(500).json({ message: "Server error" });
  }
});

// SA_details for Super Admin Dashboard
app.get("/SA_details/:id", async (req, res) => {
  const SAid = req.params.id;
  console.log(SAid)
  try {
    const SA = await query('SELECT name, username, email, password FROM superadmin WHERE SAid = ?', [SAid]);
    console.log(SA)
    if (SA.length > 0) {
      res.status(200).json(SA[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// HR Data for Super Admin Dashboard
app.get('/hr_data', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM hr_data ORDER BY HRid DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// HR details by HRid for HR Dashboard
app.get("/hr-profile/:hrID", async (req, res) => {
  const { hrID } = req.params
  try {
    console.log("fetching ", hrID, " Details")
    const result = await query(`SELECT *  FROM hr_data where hrID='${hrID}'`)
    res.status(200).json(result[0])
  } catch (err) {
    console.log("Failed to fetch details of ", hrID);
    res.status(500).json({ message: "Server Error" })
  }
})

// Update HR Profile from HR Dashboard
app.put("/hr-profile/:hrID", async (req, res) => {
  const { hrID } = req.params;
  const {
    fullName, email, mobileNo, dob, address, workEmail, workMobile,
    emergencyContactName, emergencyContactAddress, emergencyContactMobile,
    gender, branch, password
  } = req.body;

  const queryStr = `
    UPDATE hr_data
    SET 
      fullName = '${fullName}',
      email = '${email}',
      mobileNo = '${mobileNo}',
      dob = '${dob}',
      address = '${address}',
      workEmail = '${workEmail}',
      workMobile = '${workMobile}',
      emergencyContactName = '${emergencyContactName}',
      emergencyContactAddress = '${emergencyContactAddress}',
      emergencyContactMobile = '${emergencyContactMobile}',
      gender = '${gender}',
      branch = '${branch}',
      password = '${password}'
    WHERE HRid = '${hrID}'
  `;
  try {
    await query(queryStr);
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

//Fetch hr data in SA panel
app.get('/hr_data/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query('SELECT * FROM hr_data WHERE HRid = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'HR not found' });
    }
    console.log(rows);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update HR data 
app.put('/hr_data/:id', async (req, res) => {
  const { id } = req.params;
  const updatedHr = req.body;
  try {
    const result = await query('UPDATE hr_data SET ? WHERE HRid = ?', [updatedHr, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'HR not found' });
    }

    res.status(200).json({ message: 'HR updated successfully' });
    console.log(id, "details updated succssfully")
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete HR data
app.delete('/hr_data/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await query('DELETE FROM hr_data WHERE HRid = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'HR not found' });
    }

    res.status(200).json({ message: 'HR deleted successfully' });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// jobs details
app.get('/hr_jobs/:HRid', async (req, res) => {
  const { HRid } = req.params;
  try {
    const rows = await query('SELECT * FROM jobs WHERE postedBy = ?', HRid);
    res.status(200).json(rows);
  }
  catch (err) {
    console.error('Error fetching job details:', err);
    res.status(500).send('Server error');
    return;
  }
});


//View jobs by jobId for SA and HR
app.get("/view-jobs/:jobId", async (req, res) => {
  const { jobId } = req.params
  console.log(jobId)
  try {
    const jobs = await query(`SELECT * FROM jobs where jobId=${jobId}`);
    console.log(jobs)
    res.status(200).json(jobs[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//APPLICANT HISTORY for SA and HR
app.get("/applicant-history/", async (req, res) => {
  const { candidateID = '', name = '', email = "", mobileNumber = "" } = req.query;
  console.log(candidateID, email, name, mobileNumber)
  try {
    const result = await query(`SELECT * FROM intern_data WHERE candidateID='${candidateID}' OR fullName='${name}' OR email='${email}' OR mobileNo='${mobileNumber}'`)
    if (result) {
      res.status(200).json(result[0])
    }
    else {
      res.status(404).json({ message: "No user found" })
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
})
//COMPANIES LIST WHICH ARE REGISTERED
app.get("/registered-companies", async (req, res) => {
  console.log("companies")
  try {
    const result = await query('SELECT * FROM companies')
    console.log(result)
    res.status(200).json(result)
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
})

//UPDATE JOB STATUS for SA and HR
app.put("/jobs/status", async (req, res) => {
  const { status, ids } = req.body;
  console.log(status, ids);

  try {
    // Check if ids is an array
    if (Array.isArray(ids)) {
      const placeholders = ids.map(() => '?').join(',');
      const queryStr = `UPDATE jobs SET status=? WHERE jobId IN (${placeholders})`;
      const result = await query(queryStr, [status, ...ids]);
      console.log(result);
    } else {
      const result = await query('UPDATE jobs SET status=? WHERE jobId=?', [status, ids]);
      console.log(result);
    }

    res.status(200).json({ message: "Status Changed Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }

});

//UPDATE STATUS OF AN APPLICATION STATUS
app.put("/applications/status", async (req, res) => {
  const { status, ids } = req.body;
  console.log(status, ids);

  try {
    // Check if ids is an array
    if (Array.isArray(ids)) {
      const placeholders = ids.map(() => '?').join(',');
      const queryStr = `UPDATE applied_students SET status=? WHERE applicationID IN (${placeholders})`;
      const result = await query(queryStr, [status, ...ids]);
      console.log(result);
    } else {
      const result = await query('UPDATE applied_students SET status=? WHERE applicationID=?', [status, ids]);
      console.log(result);
    }

    res.status(200).json({ message: "Status Changed Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


//GETTING APPLICANT DETAILS FOR PARTICULAR JOBID

app.get('/applications', async (req, res) => {
  const { companyName } = req.query;
  let sql = 'SELECT * FROM applied_students';
  const params = [];

  if (companyName) {
    sql += ' WHERE companyName = ?';
    params.push(companyName);
  }

  try {
    const rows = await query(sql, params);
    console.log("Rows", rows);
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));

    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//APPLICANT HISTORY USING CANIDATE ID
app.get('/applicant-history/:candidateId', async (req, res) => {
  const { candidateId } = req.params
  const sql_q = `SELECT * FROM applied_students WHERE candidateID='${candidateId}'`;
  console.log(sql_q)
  try {
    const rows = await query(sql_q);
    console.log(rows)
    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response)
    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//COMPANY HISTORY USING COMPANY ID for SA and Hr

app.get("/company-history/", async (req, res) => {
  const { companyID = '', name = '', email = "", mobileNumber = "" } = req.query;
  //console.log(candidateID,email,name,mobileNumber)
  console.log(companyID)
  try {
    const result = await query(`SELECT * FROM companies WHERE companyID='${companyID}'`)
    if (result) {
      res.status(200).json(result[0])
    }
    else {
      res.status(404).json({ message: "No user found" })
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }



})

//APi to check jobs posted by a particular Hr from a company
app.get('/hr-company-history/', async (req, res) => {
  const { companyID, hrId } = req.query
  console.log("Searching company details")

  const sql_q = `SELECT * FROM jobs WHERE companyID='${companyID}' and postedBy='${hrId}'`;
  console.log(sql_q)
  try {
    const rows = await query(sql_q);
    console.log(rows)
    // Encode binary data to base64

    //console.log(response)
    res.status(200).json(rows); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//APi to check jobs posted by a particular Hr from a company
app.get('/SA-company-history/', async (req, res) => {
  const { companyID } = req.query
  console.log("Searching company details")

  const sql_q = `SELECT * FROM jobs WHERE companyID='${companyID}'`;
  console.log(sql_q)
  try {
    const rows = await query(sql_q);
    console.log(rows)
    // Encode binary data to base64

    //console.log(response)
    res.status(200).json(rows); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
//SELECT JOBS FROM PARTICULAR Company for SA and Hr
app.get('/company-history/:companyID', async (req, res) => {
  const { companyID } = req.params
  console.log("Searching company details")

  const sql_q = `SELECT * FROM jobs WHERE companyID='${companyID}'`;
  console.log(sql_q)
  try {
    const rows = await query(sql_q);
    console.log(rows)
    // Encode binary data to base64

    //console.log(response)
    res.status(200).json(rows); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//STATISTICS FOR APPLIED STUDENTS COUNT ON  SUPERADMIN DASHBOARD

app.get('/statistics/:status', async (req, res) => {
  const { status } = req.params
  try {
    let result;
    if (status === 'applied') {
      [result] = await query('SELECT COUNT(*) as count FROM applied_students;')

    }
    else {
      [result] = await query(`SELECT COUNT(*) as count FROM applied_students WHERE status='${status}'`)
    }
    //console.log(result.count)

    res.status(200).json(result); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
})

//API TO FILTER JOB APPLICANTS USING THE APPLICATION STATUS 
app.get('/job-applicants/:status', async (req, res) => {
  const { status } = req.params;
  console.log("Got here, status:", status);

  let sql;
  if (status.trim() === "interns-not-interested") {
    sql = 'SELECT * FROM applied_students WHERE status="not-interested"';
  } else {
    sql = 'SELECT * FROM applied_students WHERE status=?';
  }

  try {
    const rows = await query(sql, [status.trim()]);
    console.log(rows);
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response);
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//API TO UPDATE JOBS
app.post("/update-job", async (req, res) => {
  const { jobId, changedValues } = req.body;
  console.log("req:", req.body);

  try {
    const setPart = Object.keys(changedValues)
      .map(key => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(changedValues), jobId];

    const result = await query(
      `UPDATE jobs SET ${setPart} WHERE jobId = ?`,
      values
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: 'Job updated successfully' });
    } else {
      return res.status(400).json({ error: "Job not updated" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//API to get staticstics of jobs 
app.get('/job-statistics/:status', async (req, res) => {
  const { status } = req.params
  console.log("status :", status);
  try {
    let result;
    if (status === 'hr-leads') {
      [result] = await query('SELECT COUNT(*) as count FROM companies;')

    }
    else if (status === 'all-jobs') {
      [result] = await query('SELECT COUNT(*) as count FROM jobs;')
    }

    else {
      [result] = await query(`SELECT COUNT(*) as count FROM jobs WHERE status='${status}'`)
    }
    console.log("Status:", status, result.count)

    res.status(200).json(result); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
})
/*
//API to accept interns
app.post("/accept-interns", async (req, res) => {
  const interns = req.body;
  console.log("Interns",interns);
  const acceptedInterns = [];

  try {
    const existingInterns = await query(
      'SELECT email, mobileNo FROM interns WHERE email IN (?) OR mobileNo IN (?)',
      [
        interns.map(intern => intern.email),
        interns.map(intern => intern.mobileNo)
      ]
    );
    console.log(existingInterns);
    const existingEmails = new Set(existingInterns.map(intern => intern.email));
    const existingPhones = new Set(existingInterns.map(intern => intern.mobileNo));
    for (const intern of interns) {
      if (!existingEmails.has(intern.email) && !existingPhones.has(intern.mobileNo)) {
        await query(
          'INSERT INTO interns (fullName, email, mobileNo, altMobileNo, domain, belongedToVasaviFoundation, address, batchNo, modeOfInternship) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            intern.fullName,
            intern.email,
            intern.mobileNo,
            intern.altMobileNo,
            intern.domain,
            intern.belongedToVasaviFoundation,
            intern.address,
            intern.batchNo,
            intern.modeOfInternship
          ]
        );
        acceptedInterns.push(intern);
      }
      else if (existingEmails.has(intern.email)) {
        console.log(intern.email, "user Exists")
      }
    }

    if (acceptedInterns.length > 0) {
      await query(
        'DELETE FROM intern_requests WHERE email IN (?) OR mobileNo IN (?)',
        [
          acceptedInterns.map(intern => intern.email),
          acceptedInterns.map(intern => intern.mobileNo)
        ]
      );
    }
    const mailOptions = {
      subject: 'Registration Success',
      text: `Your request is approved`,
    };
    const emailPromises = acceptedInterns.map(intern => sendEmail(intern.email, mailOptions));
    await Promise.all(emailPromises);

    res.status(200).json({ accepted: acceptedInterns,rejected:rejected });
  } catch (error) {
    console.error('Error processing interns:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});*/

app.post("/accept-interns", async (req, res) => {
  const interns = req.body;
  console.log("Interns:", interns);

  const acceptedInterns = [];
  const rejectedInterns = [];

  try {
    const existingInterns = await query(
      'SELECT email, mobileNo FROM intern_data WHERE email IN (?) OR mobileNo IN (?)',
      [
        interns.map(intern => intern.email),
        interns.map(intern => intern.mobileNo)
      ]
    );
    console.log(existingInterns);
    const existingEmails = new Set(existingInterns.map(intern => intern.email));
    const existingPhones = new Set(existingInterns.map(intern => intern.mobileNo));

    // Get the highest candidateID number
    const lastInternQuery = 'SELECT candidateID FROM intern_data ORDER BY candidateID DESC LIMIT 1';
    const lastInternResult = await query(lastInternQuery);
    const lastInternID = lastInternResult.length > 0 ? lastInternResult[0].candidateID : null;
    let lastInternNumber = lastInternID ? parseInt(lastInternID.slice(2)) : 0;

    for (const intern of interns) {
      if (!existingEmails.has(intern.email) && !existingPhones.has(intern.mobileNo)) {
        lastInternNumber++;
        const newCandidateID = `RS${String(lastInternNumber).padStart(5, '0')}`;
        console.log(newCandidateID);

        await query(
          'INSERT INTO intern_data (candidateID, fullName, email, mobileNo, altMobileNo, domain, belongedToVasaviFoundation, address, batchNo, modeOfInternship) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newCandidateID,
            intern.fullName,
            intern.email,
            intern.mobileNo,
            intern.altMobileNo,
            intern.domain,
            intern.belongedToVasaviFoundation,
            intern.address,
            intern.batchNo,
            intern.modeOfInternship
          ]
        );
        acceptedInterns.push({ ...intern, internID: newCandidateID });
      } else {
        rejectedInterns.push(intern);
      }
    }

    if (acceptedInterns.length > 0) {
      await query(
        'DELETE FROM intern_requests WHERE email IN (?) OR mobileNo IN (?)',
        [
          acceptedInterns.map(intern => intern.email),
          acceptedInterns.map(intern => intern.mobileNo)
        ]
      );
    }

    // Send confirmation email to accepted interns
    const mailOptions = {
      subject: 'Registration Success',
      text: `Your request is approved`,
    };
    const emailPromises = acceptedInterns.map(intern => sendEmail(intern.email, mailOptions));
    await Promise.all(emailPromises);

    // Return accepted and rejected interns
    res.status(200).json({ accepted: acceptedInterns, rejected: rejectedInterns });
  } catch (error) {
    console.error('Error processing interns:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//API to reject interns
app.post("/reject-interns", async (req, res) => {
  const candidates = req.body;
  console.log('Received candidates:', candidates);
  const requestIDs = candidates.map(candidate => candidate.requestID).filter(id => id != null);
  if (requestIDs.length === 0) {
    return res.status(400).json({ message: 'No valid candidates provided' });
  }

  const placeholders = requestIDs.map(() => '?').join(',');
  const sqlQuery = `DELETE FROM intern_requests WHERE requestID IN (${placeholders})`;

  try {
    const result = await query(sqlQuery, requestIDs);
    console.log("rejected successfully !")
    if (result.affectedRows === requestIDs.length) {
      res.status(200).json({ message: 'All interns rejected successfully' });
    } else if (result.affectedRows > 0) {
      res.status(200).json({ message: `Rejected ${result.affectedRows} out of ${requestIDs.length} interns` });
    } else {
      res.status(500).json({ message: 'No documents matched the query' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//API to delete job for SA
app.delete('/delete-job/:jobId', async (req, res) => {
  const { jobId } = req.params
  console.log("ON api")
  console.log(jobId)

  try {
    const result = await query(`DELETE FROM jobs WHERE jobId = ${jobId}`);
    console.log(result)
    if (result.affectedRows === 1) {
      res.status(201).json({ message: 'Job deleted successfully' });
    } else {
      res.status(500).json({ message: "No documents matched the query" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});



app.get('/quizData/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const [quizData] = await query('SELECT pages_data FROM quiz WHERE token = ?', [token]);
    const [responsesData] = await query('SELECT responses FROM responses WHERE token = ?', [token]);
    const [internData] = await query('SELECT name, email FROM intern_data WHERE id = ?', [req.query.userId]);
    console.log("Quiz Data", quizData);
    if (quizData.length === 0 || responsesData.length === 0 || internData.length === 0) {
      return res.status(404).json({ message: 'Data not found' });
    }

    const pagesData = JSON.parse(quizData[0].pages_data);
    const responses = JSON.parse(responsesData[0].responses);
    const internDetails = internData[0];

    const submissionData = {
      dateSubmitted: responses.dateSubmitted,
      score: responses.score,
      duration: responses.duration,
      quizTitle: responses.quizTitle,
      quizDescription: responses.quizDescription,
      internDetails: internDetails
    };

    res.json({ pagesData, responses: responses.answers, submissionData });
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/update-quiz-status', (req, res) => {
  const { quizId, status } = req.body;
  const query = 'UPDATE quiz_data SET status = ? WHERE token = ?';

  pool.query(query, [status, quizId], (error, results) => {
    if (error) {
      console.error('Error updating quiz status', error);
      return res.status(500).json({ success: false, message: 'Failed to update quiz status' });
    }
    res.json({ success: true, message: 'Quiz status updated successfully' });
  });
});

app.post('/publish-quiz', (req, res) => {
  const { token, link } = req.body;
  const updateQuery = `
      UPDATE quiz_data
      SET status = 'Published', quiz_link = ?
      WHERE token = ?
    `;

  pool.query(updateQuery, [link, token], (err, result) => {
    if (err) {
      console.log('Error updating quiz status:', err);
      res.status(500).send('Error updating quiz status');
      return;
    }
    res.send('Quiz published and status updated');
  });
});

app.post('/assign-quiz-to-domain', (req, res) => {
  const { domain, quizId } = req.body;
  pool.query('SELECT candidateID FROM intern_data WHERE domain = ?', [domain], (err, users) => {

    if (err) throw err;
    const userIds = users.map(user => user.candidateID);
    const values = userIds.map(userId => [userId, quizId]);
    console.log(userIds);
    pool.query('INSERT INTO user_quizzes (internID, quiz_id) VALUES ?', [values], (err, result) => {
      if (err) throw err;
      res.json({ success: true });
    });
  });
});
app.post('/assign-quiz-to-user', (req, res) => {
  const { quizId, userIds } = req.body;
  const values = userIds.map(userId => [userId, quizId]);

  pool.query('INSERT INTO user_quizzes (internID, quiz_id) VALUES ?', [values], (err, result) => {
    if (err) {
      console.error('Error assigning quiz:', err);
      res.status(500).json({ success: false, message: 'Failed to assign quiz' });
    } else {
      res.json({ success: true, message: 'Quiz assigned successfully' });
    }
  });
});


app.get('/user-quizzes/:userId', (req, res) => {
  const { userId } = req.params;
  console.log("userID", userId);
  const quizIdsQuery = `
        SELECT quiz_id, status
        FROM user_quizzes 
        WHERE internID = ?  
    `;
  pool.query(quizIdsQuery, [userId], (err, quizIdResults) => {
    if (err) {
      console.error('Error fetching quiz IDs:', err);
      res.status(500).send('Error fetching quiz IDs');
      return;
    }

    const quizIds = quizIdResults.map(row => row.quiz_id);
    const statuses = quizIdResults.reduce((acc, row) => {
      acc[row.quiz_id] = row.status;
      return acc;
    }, {});

    if (quizIds.length === 0) {
      res.json([]);
      return;
    }
    const quizzesQuery = `
      SELECT q.token, q.quiz_name, s.schedule_quiz_from, s.schedule_quiz_to
      FROM quiz_data q
      LEFT JOIN quiz s ON q.token = s.token
      WHERE q.token IN (?)
    `;
    pool.query(quizzesQuery, [quizIds], (err, quizzesResults) => {
      if (err) {
        console.error('Error fetching quizzes:', err);
        res.status(500).send('Error fetching quizzes');
        return;
      }

      const quizzesWithStatus = quizzesResults.map(quiz => ({
        ...quiz,
        status: statuses[quiz.token] || null // Use the status from the earlier query
      }));

      res.json(quizzesWithStatus);
    });
  });
});

app.get('/quiz_data/:token', (req, res) => {
  const { token } = req.params;
  console.log("token", token);
  const quizQuery = `
        SELECT 
            uq.quiz_id, 
            uq.internID, 
            uq.status,
            i.fullName AS user_name, 
            i.email AS user_email, 
            i.domain AS user_domain
        FROM user_quizzes uq
        JOIN intern_data i ON uq.internID = i.candidateID
        WHERE uq.quiz_id = ?
    `;

  pool.query(quizQuery, [token], (err, quizResults) => {
    if (err) {
      console.error('Error fetching quiz data:', err);
      res.status(500).send('Error fetching quiz data');
      return;
    }

    if (quizResults.length === 0) {
      res.status(404).send('Quiz not found');
      return;
    }
    console.log(quizResults);
    res.json(quizResults);

  });
});

app.post('/submit-quiz', async (req, res) => {
  try {
    const { userId, token, responses, startTime, endTime, duration } = req.body;

    const existingSubmission = await query(
      'SELECT * FROM responses WHERE user_id = ? AND token = ?',
      [userId, token]
    );

    if (existingSubmission.length > 0) {
      return res.status(400).json({ message: 'Quiz already submitted.' });
    }

    await query(
      'INSERT INTO responses (user_id, token, responses, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, token, JSON.stringify(responses), startTime, endTime, duration]
    );

    res.status(200).json({ message: 'Quiz submitted successfully.' });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Error submitting quiz' });
  }
});



app.post('/submit-response', (req, res) => {
  const { userId, quizId, responses } = req.body;

  const query = 'INSERT INTO response (user_id, quiz_id, question_id, answer) VALUES ?';
  const values = responses.map(response => [userId, quizId, response.questionId, response.answer]);

  pool.query(query, [values], (err, results) => {
    if (err) {
      console.error('Error saving responses:', err);
      res.status(500).send('Error saving responses');
      return;
    }
    res.json({ success: true });
  });
});

// Update quiz status in user_quizzes table
app.put('/update-user-quiz-status/:userId/:quizId', (req, res) => {
  const { userId, quizId } = req.params;
  const query = 'UPDATE user_quizzes SET status = ? WHERE internID = ? AND quiz_id = ?';

  // Set the status to true (or false if that's the desired behavior)
  const status = true;

  pool.query(query, [status, userId, quizId], (error, results) => {
    if (error) {
      console.error('Error updating quiz status:', error);
      res.status(500).json({ error: 'An error occurred while updating the quiz status' });
    } else {
      res.status(200).json({ message: 'Quiz status updated successfully' });
    }
  });
});

app.get('/quiz-responses/:token', async (req, res) => {
  const { token } = req.params;
  console.log("Token :", token);
  const sql = `SELECT q.pages_data,
       r.id AS response_id,
       r.token,
       r.user_id,
       r.responses,
       r.start_time,
       r.end_time,
       r.duration,
       i.fullName AS user_name,
       i.email AS user_email,
       i.mobileNo,
       i.domain,
       res.score,
       res.grade
FROM responses r
JOIN intern_data i ON r.user_id = i.candidateID
LEFT JOIN (
    SELECT quiz_token,
           user_id,
           score,
           grade,
           percentage
    FROM results
    WHERE (quiz_token, user_id, id) IN (
        SELECT quiz_token,
               user_id,
               MAX(id)
        FROM results
        GROUP BY quiz_token,
                 user_id
    )
) res ON r.token = res.quiz_token AND i.candidateID = res.user_id
JOIN quiz q ON r.token = q.token
JOIN user_quizzes uq ON uq.quiz_id = q.token AND uq.internID = r.user_id
WHERE r.token = ?
`
  query(sql, [token], (err, results) => {
    if (err) {
      console.log(err);
      console.error('Error fetching quiz responses:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length === 0) {
      console.log("No responses found for this quiz");
      return res.status(404).json({ error: 'No responses found for this quiz' });
    }

    const formattedResults = results.map(row => ({
      pages_data: JSON.parse(row.pages_data),
      no_of_pages: row.no_of_pages,
      user_name: row.user_name,
      user_email: row.user_email,
      mobileNo: row.mobileNo,
      altMobileNo: row.altMobileNo,
      domain: row.domain,
      belongedToVasaviFoundation: row.belongedToVasaviFoundation,
      address: row.address,
      batchNo: row.batchNo,
      modeOfInternship: row.modeOfInternship,
      start_time: row.start_time,
      end_time: row.end_time,
      duration: row.duration,
      score: row.score,
      grade: row.grade,
      percentage: row.percentage,
      responses: JSON.parse(row.responses)
    }));

    console.log("formattedResults",formattedResults);
    res.json({
      token: token,
      responses: formattedResults,
      pages_data: JSON.parse(results[0].pages_data),
      no_of_pages: results[0].no_of_pages
    });
  });
});



app.post('/addFolder', (req, res) => {
  const { folder } = req.body;
  const query = 'INSERT INTO quiz_data (folder_name) VALUES (?)';
  pool.query(query, [folder], (err, result) => {
    if (err) {
      console.error('Error adding folder:', err);
      res.status(500).send('Failed to add folder');
      return;
    }
    res.status(200).send('Folder added successfully');
  });
});

app.post('/addSubfolder', (req, res) => {
  const { folder, subfolder } = req.body;
  const query = 'INSERT INTO quiz_data (folder_name, subfolder_name) VALUES (?, ?)';
  pool.query(query, [folder, subfolder], (err, result) => {
    if (err) {
      console.error('Error adding subfolder:', err);
      res.status(500).send('Failed to add subfolder');
      return;
    }
    res.status(200).send('Subfolder added successfully');
  });
});

app.post('/addQuiz', (req, res) => {
  const { folder, subfolder, quiz, type, token } = req.body;
  const query = 'INSERT INTO quiz_data (folder_name, subfolder_name, quiz_name, quiz_type, token) VALUES (?, ?, ?, ?, ?)';
  pool.query(query, [folder, subfolder, quiz, type, token], (err, result) => {
    if (err) {
      console.error('Error adding quiz:', err);
      res.status(500).send('Failed to add quiz');
      return;
    }
    res.status(200).send('Quiz added successfully');
  });
});

app.get('/getData', (req, res) => {
  const query = 'SELECT * FROM quiz_data';
  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Failed to fetch data');
      return;
    }
    res.status(200).json(results);
  });
});

app.get('/get-quiz/:token', (req, res) => {
  const { token } = req.params;
  const query = 'SELECT * FROM quiz WHERE token = ?';

  pool.query(query, [token], (err, results) => {
    if (err) {
      console.error('Error fetching quiz:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Add additional checks if necessary, for example:
    if (!results[0].pages_data) {
      return res.status(400).json({ message: 'Pages data missing' });
    }

    res.status(200).json(results[0]);
  });
});


app.get('/calculate-results/:quizToken/:userId', (req, res) => {
  const { quizToken, userId } = req.params;

  const correctAnswersQuery = `
        SELECT pages_data 
        FROM quiz 
        WHERE token = ?
    `;

  const studentResponsesQuery = `
        SELECT responses 
        FROM responses 
        WHERE token = ? AND user_id = ?
    `;

  const existingResultQuery = `
        SELECT * 
        FROM results 
        WHERE user_id = ? AND quiz_token = ?
    `;

  const insertResultQuery = `
        INSERT INTO results (user_id, quiz_token, score, grade)
        VALUES (?, ?, ?, ?)
    `;

  const updateResultQuery = `
        UPDATE results 
        SET score = ?, grade = ?
        WHERE user_id = ? AND quiz_token = ?
    `;

  pool.query(correctAnswersQuery, [quizToken], (err, result) => {
    if (err) throw err;

    const correctAnswers = JSON.parse(result[0].pages_data);
    pool.query(studentResponsesQuery, [quizToken, userId], (err, result) => {
      if (err) throw err;

      const studentResponses = JSON.parse(result[0].responses);
      let score = 0;
      let totalQuestions = 0;

      correctAnswers.forEach(page => {
        page.question_list.forEach(question => {
          totalQuestions += 1;
          const studentResponse = studentResponses.find(response => response.questionText === question.question_text);
          if (studentResponse && studentResponse.answer === question.correct_answer) {
            score += 1;
          }
        });
      });

      const percentage = (score / totalQuestions) * 100;

      let grade;
      if (percentage >= 90) {
        grade = 'A';
      } else if (percentage >= 80) {
        grade = 'B';
      } else if (percentage >= 70) {
        grade = 'C';
      } else if (percentage >= 60) {
        grade = 'D';
      } else {
        grade = 'F';
      }

      pool.query(existingResultQuery, [userId, quizToken], (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
          // Update existing result
          pool.query(updateResultQuery, [score, grade, userId, quizToken], (err) => {
            if (err) throw err;
            res.json({ score, grade });
          });
        } else {
          // Insert new result
          pool.query(insertResultQuery, [userId, quizToken, score, grade], (err) => {
            if (err) throw err;
            res.json({ score, grade });
          });
        }
      });
    });
  });
});

app.get('/quiz-analysis/:userId/:quizToken', (req, res) => {
  const { userId, quizToken } = req.params;
  const analysisQuery = `
        SELECT responses.responses, responses.start_time, responses.end_time, responses.duration, results.score, results.grade, quiz.pages_data
        FROM responses
        INNER JOIN results ON responses.user_id = results.user_id AND responses.token = results.quiz_token
        INNER JOIN quiz ON responses.token = quiz.token
        WHERE responses.user_id = ? AND responses.token = ?
    `;
  pool.query(analysisQuery, [userId, quizToken], (err, results) => {
    if (err) {
      console.error('Error fetching quiz analysis:', err);
      return res.status(500).json({ error: 'An error occurred while fetching quiz analysis' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const responseData = results[0];
    let responses, pagesData;
    try {
      responses = JSON.parse(responseData.responses);
      pagesData = responseData.pages_data ? JSON.parse(responseData.pages_data) : [];
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError);
      return res.status(500).json({ error: 'Error parsing quiz data' });
    }
    if (!Array.isArray(pagesData) || pagesData.length === 0) {
      console.error('pagesData is not in the expected format');
      return res.status(500).json({ error: 'Invalid quiz data structure' });
    }

    const flattenedQuestions = pagesData.flatMap(page => page.question_list || []);

    responses.forEach(response => {
      const matchingQuestion = flattenedQuestions.find(question =>
        question && question.question_text.trim() === response.questionText.trim()
      );

      if (matchingQuestion) {
        response.correct_answer = matchingQuestion.correct_answer;
        response.is_correct = response.answer === matchingQuestion.correct_answer;
      } else {
        console.warn(`No matching question found for: "${response.questionText}"`);
        response.correct_answer = 'Not found';
        response.is_correct = false;
      }
    });

    res.json({
      responses,
      start_time: responseData.start_time,
      end_time: responseData.end_time,
      duration: responseData.duration,
      score: responseData.score,
      grade: responseData.grade
    });
  });
});

app.post('/save-questions', (req, res) => {
  const { token, no_of_pages, pages_data } = req.body;
  if (!token || !no_of_pages || !pages_data) {
    return res.status(400).send('Missing required fields');
  }

  const checkQuery = 'SELECT COUNT(*) AS count FROM quiz WHERE token = ?';
  pool.query(checkQuery, [token], (err, result) => {
    if (err) {
      console.error('Error checking token existence:', err);
      return res.status(500).send('Error checking token existence');
    }

    const rowExists = result[0].count > 0;

    if (rowExists) {
      const updateQuery = 'UPDATE quiz SET no_of_pages = ?, pages_data = ? WHERE token = ?';
      pool.query(updateQuery, [no_of_pages, pages_data, token], (err, result) => {
        if (err) {
          console.error('Error updating questions:', err);
          return res.status(500).send('Error updating questions');
        }
        res.status(200).send('Questions updated successfully');
      });
    } else {
      const insertQuery = 'INSERT INTO quiz (token, no_of_pages, pages_data) VALUES (?, ?, ?)';
      pool.query(insertQuery, [token, no_of_pages, pages_data], (err, result) => {
        if (err) {
          console.error('Error inserting questions:', err);
          return res.status(500).send('Error inserting questions');
        }
        res.status(200).send('Questions added successfully');
      });
    }
  });
});

app.get('/grades', (req, res) => {
  const query = 'SELECT * FROM grades';
  pool.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/upload-data', (req, res) => {
  const { token, no_of_pages, pages_data } = req.body;

  const query = 'INSERT INTO quiz (token, no_of_pages, pages_data) VALUES (?, ?, ?)';
  const params = { token, no_of_pages, pages_data };

  pool.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.status(200).send('Bulk questions uploaded successfully');
  });
});

const validateToken = (token) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT 1 FROM quiz WHERE token = ?';
    pool.query(query, [token], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
};

app.get('/quiz-options/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const query = 'SELECT * FROM quiz WHERE token = ?';
    pool.query(query, [token], (err, results) => {
      if (err) {
        console.error('Error fetching quiz options:', err);
        return res.status(500).json({ error: 'Error fetching quiz options' });
      }
      if (results.length > 0) {
        const quizOptions = {
          timeLimit: results[0].time_limit || '',
          scheduleQuizFrom: results[0].schedule_quiz_from || '',
          scheduleQuizTo: results[0].schedule_quiz_to || '',
          qns_per_page: results[0].no_of_qns_per_page || '',
          randomizeQuestions: results[0].randomize_questions || false,
          confirmBeforeSubmission: results[0].confirm_before_submission || false,
          showResultsAfterSubmission: results[0].show_results_after_submission || false,
          showAnswersAfterSubmission: results[0].show_answers_after_submission || false,
        };
        return res.status(200).json(quizOptions);
      } else {
        return res.status(200).json({});
      }
    });
  } catch (error) {
    console.error('Error fetching quiz options:', error);
    res.status(500).json({ error: 'Error fetching quiz options' });
  }
});


app.post('/quiz-options', async (req, res) => {
  const {
    token,
    timeLimit,
    scheduleQuizFrom,
    scheduleQuizTo,
    qns_per_page,
    randomizeQuestions,
    confirmBeforeSubmission,
    showResultsAfterSubmission,
    showAnswersAfterSubmission,
  } = req.body;

  console.log(req.body);
  try {
    const tokenExists = await validateToken(token);

    const query = tokenExists
      ? `UPDATE quiz SET
                time_limit = ?, schedule_quiz_from = ?, schedule_quiz_to = ?, no_of_qns_per_page = ?,
                randomize_questions = ?, confirm_before_submission = ?, show_results_after_submission = ?, show_answers_after_submission = ?
                WHERE token = ?`
      : `INSERT INTO quiz (
                token, time_limit, schedule_quiz_from, schedule_quiz_to, no_of_qns_per_page,
                randomize_questions, confirm_before_submission, show_results_after_submission, show_answers_after_submission
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = tokenExists
      ? [timeLimit, scheduleQuizFrom, scheduleQuizTo, qns_per_page, randomizeQuestions, confirmBeforeSubmission, showResultsAfterSubmission, showAnswersAfterSubmission, token]
      : [token, timeLimit, scheduleQuizFrom, scheduleQuizTo, qns_per_page, randomizeQuestions, confirmBeforeSubmission, showResultsAfterSubmission, showAnswersAfterSubmission];

    pool.query(query, values, (err, results) => {
      if (err) {
        console.error(`Error ${tokenExists ? 'updating' : 'inserting'} quiz options:`, err);
        return res.status(500).json({ error: `Error ${tokenExists ? 'updating' : 'inserting'} quiz options` });
      }
      res.status(200).json({ message: `Quiz options ${tokenExists ? 'updated' : 'saved'} successfully` });
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Error validating token' });
  }
});

app.get('/getAllData', async (req, res) => {
  await query('SELECT * FROM quiz_data', (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Failed to fetch data');
      return;
    }
    res.status(200).json(results);
  });
});

app.put('/renameQuiz/:token', async (req, res) => {
  const { token } = req.params;
  const { name: newName } = req.body;
  console.log(token, newName);
  await query("UPDATE quiz_data SET quiz_name = ? WHERE token = ?", [newName, token], (err, result) => {
    if (err) {
      console.log('Error renaming quiz ');
      console.error('Error renaming quiz:', err);
      return res.status(500).send('Failed to rename quiz');
    }
    console.log("renamed successfully")
    res.send('Quiz renamed successfully');
  });
});


app.delete('/deleteQuiz/:token', (req, res) => {
  const { token } = req.params;
  const query = 'DELETE FROM quiz_data WHERE token = ?';
  pool.query(query, [token], (err, result) => {
    if (err) {
      console.error('Error deleting quiz:', err);
      res.status(500).send('Failed to delete quiz');
      return;
    }
    res.status(200).send('Quiz deleted successfully');
  });
});

app.delete('/deleteFolder/:folder', (req, res) => {
  const { folder } = req.params;
  const query = 'DELETE FROM quiz_data WHERE folder_name = ?';
  pool.query(query, [folder], (err, result) => {
    if (err) {
      console.error('Error deleting folder:', err);
      res.status(500).send('Failed to delete folder');
      return;
    }
    res.status(200).send('folder deleted successfully');
  });
});

app.get('/domains', (req, res) => {
  const query = 'SELECT DISTINCT domain FROM intern_data';
  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching domains:', err);
      res.status(500).send('Error fetching domains');
      return;
    }
    res.status(200).json(results);
  });
});

app.get('/interns', (req, res) => {
  const query = 'SELECT id, name, mail, domain FROM intern_data';
  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching interns:', err);
      res.status(500).send('Error fetching interns');
      return;
    }
    res.json(results);
  });
});




app.get('/interns/:id', (req, res) => {
  const query = 'SELECT id, name, mail, domain FROM intern_data WHERE id = ?';
  pool.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error fetching intern:', err);
      res.status(500).send('Error fetching intern data');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Intern not found');
      return;
    }
    res.json(results[0]);
  });
});

app.get('/submissions', (req, res) => {
  const query = 'SELECT * FROM intern_data ORDER BY domain';
  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.status(200).json(results);
  });
})



app.get('/sa-job-applicants/', async (req, res) => {
  const { status } = req.query
  console.log("got  here")
  const sql = `SELECT applied_students.*,
      J.JobId,
      J.postedBy
   FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId WHERE applied_students.status='${status}'`;

  try {
    const rows = await query(sql);

    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response)
    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//API to search jobs using candidateId, hrid
app.get('/hr-job-applicant-history/', async (req, res) => {
  const { candidateId, hrId } = req.query


  const sql_q = `SELECT applied_students.*,
      J.JobId,
      J.postedBy FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId WHERE J.postedBy = '${hrId}' and applied_students.candidateID='${candidateId}'`;
  console.log(sql_q)
  try {
    const rows = await query(sql_q);
    console.log(rows)
    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response)
    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/intern-job-applicant-history/', async (req, res) => {
  const { candidateId } = req.query;

  const sql_q = "SELECT * from applied_students where candidateID = ?";

  try {
    const rows = await query(sql_q, [candidateId]);
    console.log(rows);
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response);

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

//API for hr dashboard statistics
app.get('/hr-job-applicants/', async (req, res) => {
  const { status, hrId } = req.query
  const sql = `SELECT applied_students.*,
      J.JobId,
      J.postedBy,
       J.companyID
   FROM applied_students JOIN jobs AS J ON applied_students.JobID = J.JobId WHERE J.postedBy = '${hrId}' and applied_students.status='${status}'`;

  try {
    const rows = await query(sql);

    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response)
    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get("/hr-view-jobs", async (req, res) => {
  const { hrId } = req.query

  try {
    const rows = await query(`SELECT * FROM jobs WHERE postedBy = '${hrId}' ORDER BY postedOn DESC`);

    // Encode binary data to base64
    const response = rows.map(row => ({
      ...row,
      resume: row.resume ? row.resume.toString('base64') : null
    }));
    console.log(response)
    res.status(200).json(response); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.get("/hr-view-jobs-status", async (req, res) => {
  const { status, hrId } = req.query

  try {
    let sql = '';
    if (status == "all-jobs") {
      sql = `SELECT * FROM jobs WHERE postedBy = '${hrId}'`;
    }
    else {
      sql = `SELECT * FROM jobs WHERE status='${status}' and postedBy = '${hrId}'`;
    }
    const rows = await query(sql);

    // Encode binary data to base64


    res.status(200).json(rows); // Send back the modified rows
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get("/view-jobs-status", async (req, res) => {
  const { status } = req.query

  try {
    let sql = '';
    if (status == 'all-jobs') {
      sql = `SELECT * FROM jobs`;
    }
    else {
      sql = `SELECT * FROM jobs WHERE status='${status}'`;
    }
    const rows = await query(sql);

    console.log(rows)
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.get("/hr-view-leads", async (req, res) => {
  const{hrId}=req.query
  try {
    const jobs = await query(`SELECT * FROM companies WHERE publishedHrID='${hrId}'`);
    console.log("Jobs", jobs)
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/hr-other-leads", async (req, res) => {
  const{hrId}=req.query
  try {
    const jobs = await query(`SELECT * FROM companies WHERE publishedHrID!='${hrId}'`);
    console.log("Jobs", jobs)
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/add-hr",async(req,res)=>{
  const {address,companyName,email,hrId,hrName,phoneNumber,website}=req.body;

  try{
    console.log("In")
    const respo=await query(`INSERT INTO companies (companyName,website,mobileNo,email,address,hrName,publishedHrID) VALUES(?,?,?,?,?,?,?)`,[companyName,website,phoneNumber,email,address,hrName,hrId])
    console.log("restp",respo)
    res.status(200).json({"message":"Company added Successfully"})
  }catch(error){
    res.status(500).json({"message":"Server error"})
  }
   
})

