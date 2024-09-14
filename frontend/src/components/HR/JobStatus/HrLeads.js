import React, { useMemo, useState, useEffect } from 'react';
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table';
import { useNavigate, Link } from 'react-router-dom';
import { FaFilePdf } from "react-icons/fa";
import HrNavbar from '../HrNavbar/HrNavbar';
import * as XLSX from 'xlsx';
import apiService from '../../../apiService';
import Cookies from 'js-cookie';
import { Container, Row, Col, Button, Form, Table, DropdownButton, Dropdown } from 'react-bootstrap';
const HrId=Cookies.get('HRid')
const HrLeads = () => {
  const [data, setData] = useState([]); // State to store table data
  const [selectedIds, setSelectedIds] = useState([]); // State to store selected application IDs
  const [selectedView, setSelectedView] = useState('My Leads'); // State to track the selected view
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch data from the backend API
    const fetchData = async () => {
      
      try {
        if(selectedView==='My Leads'){
        const response = await apiService.get(`/hr-view-leads?hrId=${HrId}`); // Adjust the URL as needed
        setData(response.data.map(item => ({ ...item, isEditing: false })));
        }
        else{
          const response = await apiService.get(`/hr-other-leads?hrId=${HrId}`); // Adjust the URL as needed
        setData(response.data.map(item => ({ ...item, isEditing: false })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedView]);

  const updateStatus = async (jobId, status) => {
    try {
      // Update the status in the backend
      await apiService.put(`/jobs/status`, { status, ids: Array.isArray(jobId) ? jobId : [jobId] });

      // Update the status in the frontend
      setData(prevData => prevData.map(app =>
        (Array.isArray(jobId) ? jobId.includes(app.jobId) : app.jobId === jobId) ? { ...app, status, isEditing: false } : app
      ));

      setSelectedIds([]); // Clear the selection after updating status
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

 


  const memoColumns = useMemo(() => {
    const baseColumns = [
      { Header: 'Company ID', accessor: 'companyID' },
      {
        Header: 'Company Name',
        accessor: 'companyName',
        Cell: ({ row }) => (
          <Link style={{ textDecoration: 'none', color: '#53289e', fontWeight: '500' }} to={`/companies/${row.original.companyID}`}>
            {row.original.companyName}
          </Link>
        )
      },
      { Header: 'Address', accessor: 'address' },
      {
        Header: 'Website',
        accessor: 'website',
        Cell: ({ row }) => (
          <a href={row.original.website} target="_blank" rel="noopener noreferrer">
            {row.original.website}
          </a>
        )
      }
    ];

    if (selectedView === 'My Leads') {
      return [
        ...baseColumns,
        { Header: 'Hr name', accessor: 'hrName' },
        { Header: 'Hr Email', accessor: 'email' },
        { Header: 'Mobile Number', accessor: 'mobileNo' },
//        { Header: 'Published Hr', accessor: 'publishedHr' },
      ];
    }

    return baseColumns;
  }, [selectedView]);


  const memoData = useMemo(() => data, [data]);

  const downloadExcel = (completeData = false) => {
    const dataToExport = completeData ? memoData : page;
    
    const exportData = dataToExport.map(row => {
      const rowData = {};
      memoColumns.forEach(column => {
        if (column.accessor !== 'resume' && column.accessor !== 'selection') {
          rowData[column.Header] = row.original ? row.original[column.accessor] : row[column.accessor] || '';
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    const fileName = `Companies ${completeData ? '_Complete' : ''}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleResumeDownload = async (jobId) => {
    try {
      const response = await apiService({
        url: `/download-resume/${jobId.jobId}`,
        method: 'GET',
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume-${jobId.fullName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading the file:', error);
    }
  };

  const onClickAddHr = () => {
    navigate("/hr-dashboard/add-hr")
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    setGlobalFilter,
    state,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize
  } = useTable(
    { columns: memoColumns, data: memoData, initialState: { pageSize: 10 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const { globalFilter, pageIndex, pageSize } = state;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 0; i < pageCount; i++) {
      pageNumbers.push(
        <Button
          key={i}
          onClick={() => gotoPage(i)}
          variant={i === pageIndex ? 'primary' : 'secondary'}
          style={{ margin: '0 5px', fontWeight: '600' }}
        >
          {i + 1}
        </Button>
      );
    }
    return pageNumbers;
  };

  return (
    <>
      <HrNavbar />
      <Container fluid className="p-5" style={{ width: '90vw' }}>
        <Row className="mb-4">
          <Col>
            <h1>HR Leads</h1>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <DropdownButton id="dropdown-basic-button" title={selectedView}>
              <Dropdown.Item onClick={() => setSelectedView('My Leads')}>My Leads</Dropdown.Item>
              <Dropdown.Item onClick={() => setSelectedView('Other Leads')}>Other Leads</Dropdown.Item>
            </DropdownButton>
          </Col>
          <Col md={6} className="d-flex justify-content-end align-items-center">
            <Form.Label className="me-2" style={{ fontSize: '20px', fontWeight: 'bold' }}>Search:</Form.Label>
            <Form.Control
              type="search"
              value={globalFilter || ''}
              onChange={e => setGlobalFilter(e.target.value || undefined)}
              placeholder="Search all columns"
              style={{ height: '30px', border: '1px solid #737478', outline: 'none', borderRadius: '2px' }}
            />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <Button onClick={() => downloadExcel(false)} style={{ height: '40px', marginRight: '10px', backgroundColor: '#6cde37', border: 'none', borderRadius: '5px', color: '#ffffff', fontWeight: 'bold' }}>
              Download Current Page as Excel
            </Button>
            <Button onClick={() => downloadExcel(true)} style={{ height: '40px', backgroundColor: '#37a6de', marginRight: '10px', border: 'none', borderRadius: '5px', color: '#ffffff', fontWeight: 'bold' }}>
              Download Complete Data as Excel
            </Button>
          </Col>
          <Col md={6} className="d-flex justify-content-end">
            <Button onClick={onClickAddHr} style={{ height: '40px', backgroundColor: '#6c37de', border: 'none', borderRadius: '5px', color: '#ffffff', fontWeight: 'bold' }}>
              Add HR
            </Button>
          </Col>
        </Row>
        <Row>
          <Col>
            <Table {...getTableProps()} className="table table-bordered">
              <thead>
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()} style={{ backgroundColor: '#f7f7f9' }}>
                    {headerGroup.headers.map(column => (
                      <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                        {column.render('Header')}
                        <span>{column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}</span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {page.map(row => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()}>
                      {row.cells.map(cell => (
                        <td {...cell.getCellProps()}>
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row className="d-flex justify-content-between align-items-center">
          <Col md={4}>
            <Form.Select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              style={{ width: '100px', display: 'inline-block' }}
            >
              {[10, 25, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={8} className="d-flex justify-content-end align-items-center">
            <Button onClick={() => previousPage()} disabled={!canPreviousPage} style={{ marginRight: '10px' }}>
              Previous
            </Button>
            {renderPageNumbers()}
            <Button onClick={() => nextPage()} disabled={!canNextPage} style={{ marginLeft: '10px' }}>
              Next
            </Button>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default HrLeads;
