
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { Link, useNavigate, } from 'react-router-dom';
import Cookies from 'js-cookie';
import QuizDash from '../Quiz/Admin/quiz/quizdash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import ramana from '../../images/p3.jpeg';

const HrNavbar = () => {
  const navigate = useNavigate()
  const getUserInitials = (hr) => {
    console.log(hr)
    const initials = hr.split(' ').map((n) => n[0]).join('');
    console.log(initials)
    return initials.toUpperCase();
  };
  const logout = () => {
    Object.keys(Cookies.get()).forEach(cookieName => {
      Cookies.remove(cookieName);
    });
    navigate("/")
  }


  return (
    <Navbar bg="#B3C8CF" expand="lg" style={{ width: '100vw', justifyContent: 'center', backgroundColor: '#282929', color: 'white', zIndex: 1,boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px' }}>
      <Container style={{ width: '100vw' }}>
        <Link to="/hr-dashboard"><Navbar.Brand href="#home">
          <img
            src={ramana}
            width="150"
            className="d-inline-block align-top rounded"
            alt="Left Logo"
          />
        </Navbar.Brand></Link>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" style={{ width: '100vw', color: 'white' }} >
          <Nav className="ms-auto">
            <Dropdown as={Nav.Item} className="fw-bold me-4 h-25">
              <Dropdown.Toggle as={Nav.Link} style={{ color: 'white', textDecoration: 'none' }}>
                Post a Job
              </Dropdown.Toggle>
              <Dropdown.Menu className='h-250  custom-dropdown-menu' style={{ backgroundColor: "white" }}>
                <Dropdown.Item as={Link} to="/hr-dashboard/post-jobs">Post Job</Dropdown.Item>
                <Dropdown.Item as={Link} to="/hr-dashboard/view-jobs">View Jobs</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Nav.Item style={{ width: '120px', textDecoration: 'none', textAlign: 'center' }} className="nav-link fw-bold me-4 ">
              <Link to="/hr-dashboard/registration-requests" style={{ textDecoration: 'none', color: 'white' }} >Registrations</Link>
            </Nav.Item >
            <Nav.Item style={{ width: '100px', textDecoration: 'none', textAlign: 'center' }} className="nav-link fw-bold me-4 ">
              <Link to="/hr-dashboard/quiz" style={{ textDecoration: 'none', color: 'white' }} >Quiz</Link>
            </Nav.Item >
            <Nav.Item className="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center fw-bold" style={{ width: '50px', height: '50px' }}>
              <Link to="/hr-dashboard/profile" style={{ textDecoration: 'none', color: 'white' }} >HR</Link>
            </Nav.Item >
            <Nav.Item
              style={{
                textDecoration: 'none',
                color: 'white',
                marginLeft: '30px',
                marginright: '0',
                textAlign: 'center',
              }}
              className="nav-link fw-bold me-4"
            >
              <button
                onClick={logout}
                className="btn bg-transparent logout-btn fw-bold ml-5 w-100 pt-0"
                style={{ color: 'white', alignSelf: 'center', width: '100%' }}
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
              </button>
            </Nav.Item>
          </Nav>

        </Navbar.Collapse>
      </Container>
    </Navbar>


  )
}

export default HrNavbar