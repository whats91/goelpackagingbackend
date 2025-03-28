const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();

//IMAGE_URL_DOMAIN=http://192.168.1.10:3000

const imageUrlDomain = `${process.env.IMAGE_URL_DOMAIN}/image/`;
const imageDir = process.env.IMAGE_DIR || 'E:\\Dropbox wilfordtechnology\\Dropbox\\NodeCode\\GoelPackaging\\public';

// Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Define SQL queries with placeholders and required parameters
const queryMappings = {
  masterData: {
    sql: 'SELECT Code, MasterType, Name FROM Master1 WHERE MasterType = {{MasterType}}',
    parameters: ['MasterType']
  },
  allStatus: { sql: 'SELECT Code, MasterType, Name FROM Master1 WHERE MasterType = 1402' },
  allMasters: { sql: 'SELECT * FROM Master1 Where MasterType = 6 and code = 36431' },
  update: {
    sql: `UPDATE Vchotherinfo
          SET Of2 = {{Of2}}
          WHERE vchcode = {{vchcode}}`,
    parameters: ['Of2', 'vchcode']
  },
  pendingJob: { sql: `SELECT 
    FORMAT(
        (SELECT SUM(T3b.Value2)
         FROM Tran3 AS T3b
         WHERE T3b.refcode = T3.refcode
        ), "0.00"
    ) AS PendQty,
    T3.Value2 AS Qty,
    T3.Vchcode,
    (SELECT TRIM(T1.Vchno)
     FROM Tran1 AS T1
     WHERE T1.vchcode = T3.vchcode
    ) AS SoVchno,
    T3.Date,
    (SELECT V.Of1
     FROM Vchotherinfo AS V
     WHERE V.vchcode = T3.vchcode
    ) AS DueDate,
    (SELECT M.Name
     FROM Master1 AS M
     WHERE M.Code IN 
       (SELECT VAL(V.Of2)
        FROM Vchotherinfo AS V
        WHERE V.vchcode = T3.vchcode
       )
    ) AS Status,
    (SELECT M.Code
     FROM Master1 AS M
     WHERE M.Code IN 
       (SELECT VAL(V.Of2)
        FROM Vchotherinfo AS V
        WHERE V.vchcode = T3.vchcode
       )
    ) AS Of2Code,
    (SELECT M.Name
     FROM Master1 AS M
     WHERE M.Code = T3.Mastercode1
    ) AS ItemName,
    (SELECT M.Name
     FROM Master1 AS M
     WHERE M.Code = T3.Mastercode2
    ) AS PartyName,
    (SELECT M.Alias
     FROM Master1 AS M
     WHERE M.Code = T3.Mastercode1
    ) AS Alias
FROM 
    Tran3 AS T3
WHERE 
    T3.Vchtype = 12 
    AND T3.method = 1
    AND 
    (
      SELECT SUM(T3b.Value1)
      FROM Tran3 AS T3b
      WHERE T3b.refcode = T3.refcode
    ) <> 0` },
  singleVchData: {
    sql: 'Select Date,Trim(Vchno) as Vchno1,(Select Of1 From Vchotherinfo as V where V.vchcode=tran2.Vchcode) as Duedate,(Select Name From Master1 where Code=tran2.Cm1) as PartyName, (Select Narration1 From Vchotherinfo as V where V.Vchcode=Tran2.Vchcode) as Narr,(Select Alias From master1 where Code=tran2.Mastercode1) as JobCard, (Select Name From Master1 where Code=tran2.Mastercode1) as ItemName,Value1 As Qty,(Select Name From Master1 where Code in (Select Val(Of2) From Vchotherinfo as V where V.vchcode=tran2.Vchcode)) as Status,(Select Name From Master1 where Code=tran2.Cm2) as MainUnit, Value2 as AltQty,(Select Name From Master1 where Code=Tran2.Cm3) as AltUnit, (Select D21 From Master1 where Code=Tran2.Mastercode1) as Mrp,(Select Of1 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as SheetSize, (Select Of2 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as JobType,(Select Of3 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as ReadySize, (Select Of4 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as NoOfPlys,(Select Of5 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as SerialNoOfDie, (Select Of6 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as ColourDescription,(Select Of7 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as PrePlateStatus,(Select Of8 From Masteraddressinfo as M where M.Mastercode=tran2.Mastercode1) as PlateNo,(Select Top 1 ActionTime from Checklist as c where C.Code=Tran2.Vchcode and Type=2) as TTime ,(Select D24 from Master1 where Code=tran2.Mastercode1) as PakCof,(Select Name From Master1 where Code in(Select Cm10 From Master1 where Code=tran2.Mastercode1)) as PackUnit from Tran2 where Vchtype=12 and rectype in(2,4,7) and Vchcode = {{MasterType}}',
    parameters: ['MasterType']
  }
};

// Protected GET endpoint to fetch data from external API
router.get('/getdata', authenticateJWT, async (req, res) => {
  try {
    const queryName = req.query.queryName;
    console.log('User role:', req.user.role, 'User type:', req.user.type, 'Query Name:', queryName);

    if (!queryName) {
      throw new Error('QueryName parameter is required');
    }

    const queryConfig = queryMappings[queryName];
    if (!queryConfig) {
      throw new Error('Invalid queryName parameter');
    }

    let query = queryConfig.sql;

    // Check if the query has parameters and validate/replace them
    if (queryConfig.parameters) {
      queryConfig.parameters.forEach((param) => {
        if (!req.query[param]) {
          throw new Error(`Missing parameter: ${param}`);
        }
      });
      queryConfig.parameters.forEach((param) => {
        const value = req.query[param];
        if (param === 'MasterType') {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed)) {
            throw new Error(`Invalid value for ${param}: must be a number`);
          }
          const regex = new RegExp(`{{${param}}}`, 'g');
          query = query.replace(regex, parsed);
        } else if (param === 'someStringParam') {
          const escapedValue = value.replace(/'/g, "''");
          const regex = new RegExp(`{{${param}}}`, 'g');
          query = query.replace(regex, `'${escapedValue}'`);
        }
      });
    }

    // Convert the SQL query to Base64
    const encodedQuery = Buffer.from(query, 'utf-8').toString('base64');
    const postData = JSON.stringify({ Query: encodedQuery });

    console.log('calling external api with query:');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/direct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Submit the POST request to the external API
    const promise = new Promise((resolve, reject) => {
      const reqHttp = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve({ statusCode: response.statusCode, data }));
      });
      reqHttp.on('error', reject);
      reqHttp.write(postData);
      reqHttp.end();
    });

    console.log('waiting for response');

    const { statusCode, data } = await promise;
    if (statusCode < 200 || statusCode > 299) {
      throw new Error(`Request failed with status code ${statusCode}`);
    }

    let externalData = JSON.parse(data);

    console.log('response received', externalData);

    // If the logged-in user is an employee and the query is pendingJob,
    // filter the data so that only records with a Status matching the user's role are returned.
    if (req.user.type === 'employee' && queryName === 'pendingJob' && Array.isArray(externalData)) {
      externalData = externalData.filter(record => record.Status === req.user.role);
    }

    console.log('filtered data:', externalData);

    res.json({
      success: true,
      message: 'Busy data retrieved successfully',
      data: externalData
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data from external API',
      error: error.message
    });
  }
});

// Protected GET endpoint to fetch single Vch data from external API
router.get('/singleVchData', authenticateJWT, async (req, res) => {
  try {
    // Validate that the required parameter exists
    if (!req.query.MasterType) {
      throw new Error('Missing parameter: MasterType');
    }

    let queryConfig = queryMappings.singleVchData;
    let query = queryConfig.sql;

    // Validate and replace parameters for the query
    if (queryConfig.parameters) {
      queryConfig.parameters.forEach((param) => {
        const value = req.query[param];
        if (!value) {
          throw new Error(`Missing parameter: ${param}`);
        }
        if (param === 'MasterType') {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed)) {
            throw new Error(`Invalid value for ${param}: must be a number`);
          }
          const regex = new RegExp(`{{${param}}}`, 'g');
          query = query.replace(regex, parsed);
        }
        // Add additional parameter handling if needed.
      });
    }

    // Convert the SQL query to Base64
    const encodedQuery = Buffer.from(query, 'utf-8').toString('base64');
    const postData = JSON.stringify({ Query: encodedQuery });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/direct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Submit the POST request to the external API
    const promise = new Promise((resolve, reject) => {
      const reqHttp = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => resolve({ statusCode: response.statusCode, data }));
      });
      reqHttp.on('error', reject);
      reqHttp.write(postData);
      reqHttp.end();
    });

    const { statusCode, data } = await promise;

    if (statusCode < 200 || statusCode > 299) {
      throw new Error(`Request failed with status code ${statusCode}`);
    }

    const externalData = JSON.parse(data);

    console.log('Single Vch data:', externalData);

    // --- New logic to add image URL based on ItemName ---
    // Define the directory where images are stored.
    // const imageDir = imageDir;
    // If externalData is an array, iterate over each record.
    if (Array.isArray(externalData)) {
      externalData.forEach(record => {
        const itemName = record.ItemName;
        let foundImage = false;
        if (itemName) {
          // Sanitize the item name by removing invalid file characters
          const sanitizedItemName = itemName.replace(/['\\/:*?"<>|]/g, '');
          
          // Define the possible extensions.
          const extensions = ['.png', '.jpg', '.jpeg'];
          for (let ext of extensions) {
            const fileName = sanitizedItemName + ext;
            const fullPath = path.join(imageDir, fileName);
            if (fs.existsSync(fullPath)) {
              // Build the image URL. Use encodeURIComponent to handle spaces/special characters.
              record.imageUrl = imageUrlDomain + encodeURIComponent(fileName);
              foundImage = true;
              break;
            }
          }
        }
        // If no image was found, you may choose to set imageUrl to an empty string or null.
        if (!foundImage) {
          record.imageUrl = '';
        }
      });
    }
    // --- End of new logic ---

    res.json({
      success: true,
      message: 'Single Vch data retrieved successfully',
      data: externalData
    });
  } catch (error) {
    console.error('Error fetching single Vch data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch single Vch data from external API',
      error: error.message
    });
  }
});

router.post('/updatedata', authenticateJWT, async (req, res) => {
  try {
    const queryName = req.query.queryName;
    
    if (!queryName) {
      throw new Error('QueryName parameter is required');
    }

    const queryConfig = queryMappings[queryName];

    if (!queryConfig) {
      throw new Error('Invalid queryName parameter');
    }

    let query = queryConfig.sql;

    // Check if the query has parameters
    if (queryConfig.parameters) {
      queryConfig.parameters.forEach((param) => {
        if (!req.query[param]) {
          throw new Error(`Missing parameter: ${param}`);
        }
      });

      // Replace placeholders with parameter values
      queryConfig.parameters.forEach((param) => {
        const value = req.query[param];
        // For parameters that should be numbers
        if (['MasterType', 'Of2', 'vchcode'].includes(param)) {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed)) {
            throw new Error(`Invalid value for ${param}: must be a number`);
          }
          const regex = new RegExp(`{{${param}}}`, 'g');
          query = query.replace(regex, parsed);
        } else if (param === 'someStringParam') {
          // Example for string parameters
          const escapedValue = value.replace(/'/g, "''");
          const regex = new RegExp(`{{${param}}}`, 'g');
          query = query.replace(regex, `'${escapedValue}'`);
        }
        // Add more parameter validation/formatting as needed
      });
    }

    // Convert the SQL query to Base64
    const encodedQuery = Buffer.from(query, 'utf-8').toString('base64');
    const postData = JSON.stringify({ Query: encodedQuery });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Submit the POST request to the external API
    const promise = new Promise((resolve, reject) => {
      const reqHttp = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve({ statusCode: response.statusCode, data }));
      });
      reqHttp.on('error', reject);
      reqHttp.write(postData);
      reqHttp.end();
    });

    const { statusCode, data } = await promise;

    if (statusCode < 200 || statusCode > 299) {
      throw new Error(`Request failed with status code ${statusCode}`);
    }

    const externalData = JSON.parse(data);

    res.json({
      success: true,
      message: 'Busy data retrieved successfully',
      data: externalData
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data from external API',
      error: error.message
    });
  }
});

module.exports = { busyRouter: router };
