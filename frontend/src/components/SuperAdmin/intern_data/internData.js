import React, { useState, useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { Table, Box, Pagination, TextField } from '@mui/material';
import 'bootstrap/dist/css/bootstrap.min.css';
import apiService from '../../../apiService';
import { Link } from 'react-router-dom';

const InternTable = () => {
  const [interns, setInterns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [internsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get('/intern_data');
        setInterns(response.data);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (candidateID) => {
    console.log("Deleting intern with ID: ", candidateID);
    try {
      await apiService.delete(`/intern_data/${candidateID}`);
      setInterns((prevInterns) => prevInterns.filter(intern => intern.candidateID !== candidateID));
    } catch (error) {
      console.error("Error deleting data: ", error);
    }
  };

  const filteredInterns = interns.filter((intern) =>
    Object.values(intern).some(value =>
      value != null && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const indexOfLastIntern = currentPage * internsPerPage;
  const indexOfFirstIntern = indexOfLastIntern - internsPerPage;
  const currentInterns = filteredInterns.slice(indexOfFirstIntern, indexOfLastIntern);
  const totalPages = Math.ceil(filteredInterns.length / internsPerPage);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Container className="intern-table-container" style={{ overflow: 'auto', width: "100%" }}>
      <Box sx={{ marginBottom: 2, display: 'flex', justifyContent: 'center' }}>
        <TextField
          variant="outlined"
          placeholder="Search here..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: '70%' }}
        />
      </Box>

      <Table
        bordered
        hover
        responsive
        style={{ backgroundColor: '#1f2c39' }}
      >
        <thead style={{ backgroundColor: '#1f2c39', color: 'white' }}>
          <tr>
            <th style={{ padding: '16px' }}>Intern ID</th>
            <th style={{ padding: '16px' }}>Full Name</th>
            <th style={{ padding: '16px' }}>Email</th>
            <th style={{ padding: '16px' }}>Mobile No</th>
            <th style={{ padding: '16px' }}>Domain</th>
            <th style={{ padding: '16px' }}>Batch No</th>
            <th style={{ padding: '16px' }}>Mode of Internship</th>
            <th style={{ padding: '16px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {currentInterns.map(intern => (
            <tr key={intern.candidateID} style={{ backgroundColor: '#ffffff', '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.candidateID}</td>
              <td style={{ padding: '16px', textAlign: 'center' }}>
                <Link style={{ textDecoration: "none", fontWeight: "bold" }} to={`/sa_dash/student/${intern.candidateID}`}>{intern.fullName}</Link></td>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.email}</td>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.mobileNo}</td>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.domain}</td>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.batchNo}</td>
              <td style={{ padding: '16px', textAlign: 'center' }}>{intern.modeOfInternship}</td>
              <td style={{ padding: '16px' }}>
                <Button variant="danger" onClick={() => handleDelete(intern.candidateID)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* Media Queries */}
      <style jsx>{`
        @media (max-width: 768px) {
          .intern-table-container {
            width: 100%;
          }
          table th, table td {
            padding: 8px;
            font-size: 12px;
          }
          table th {
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          table th, table td {
            padding: 4px;
            font-size: 10px;
          }
          table th {
            font-size: 12px;
          }
          .intern-table-container {
            width: 100%;
            padding: 0;
          }
        }

        @media (max-width: 360px) {
          table th, table td {
            padding: 2px;
            font-size: 8px;
          }
        }
      `}</style>
    </Container>
  );
};

export default InternTable;
