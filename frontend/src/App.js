import './App.css';
import {  Route, Routes, Navigate, HashRouter, BrowserRouter } from 'react-router-dom';
import Cookies from 'js-cookie';
import SADash from './components/SuperAdmin/Dashboard/SA_Dashboard';
import Home from './components/Home/components/Home';
import InternDash from './components/Intern/Intern_Dashboard';
import HrPortal from './components/HR/HRDashboard/HrDashboard';
import AddHr from './components/HR/JobStatus/AddHr';
import 'react-toastify/dist/ReactToastify.css';
import CompanyData from './components/HR/CompanyData';
import StudentDetails from './components/HR/StudentData';
import HrJobDesc from './components/HR/HrJobDesc';
import PostJobs from './components/HR/HrPostJobs/HrPostJobs';
import ProfilePage from './components/HR/HrProfile/HrProfile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import RegistrationRequests from './components/HR/RegistrationRequests/RegistrationRequests';
import HrViewJobs from './components/HR/HrViewJobs/HrViewJobs';
import StudentsApplied from './components/HR/StudentsApplied';
import StudentsPlaced from './components/HR/StudentsPlaced';
import HrLeads from './components/HR/JobStatus/HrLeads';
import JdReceived from './components/HR/JobStatus/JdReceived';
import JobStatus from './components/HR/JobStatus/JobStatus';
import SAJobDesc from './components/SuperAdmin/SAViewJobs/SAJobDesc';
import QuizDash from './components/HR/Quiz/Admin/quiz/quizdash';
import CreateDash from './components/HR/Quiz/Admin/quiz/QuizCreate/CreateDash';
import QuizAttempt from './components/Intern/quiz/QuizAttempt';
import UserQuizAnalysis from './components/Intern/quiz/userAnalyze';
import PreviewQuiz from './components/HR/Quiz/Admin/quiz/preview/preview';
import QuizResults from './components/HR/Quiz/Admin/results'
import AnalyzeQuiz from './components/SuperAdmin/Quiz/Analyze/Analyze';

function PrivateRoute({ role, element }) {
  const userRole = Cookies.get('role');
  const verified = Cookies.get('verified');
  console.log("Role:", userRole, "Verified:", verified);
  if (verified === 'true' && userRole === role) {
    return element;
  }
  return( 
  <Navigate to="/" />);
}

function App() {
  return (
    <div className=''>
      <BrowserRouter>
        <Routes>
          <Route path="/test/:token" element={<PrivateRoute role="intern"  element={<QuizAttempt />} />} />
          <Route path='/*' element={<Home />} />
          <Route path='/quiz/preview/:token' element={<PreviewQuiz />} />
          <Route path="/results/:quizToken/:userId" element={<QuizResults />} />
          <Route path='/quiz-analysis/:userId/:quizToken' element={<PrivateRoute role="intern" element={<UserQuizAnalysis />} />} />

          <Route path='/quiz/preview/:token' element={<PrivateRoute role="HR" element={<PreviewQuiz />} />} />
          <Route path='/quiz/preview/:token' element={<PrivateRoute role="SA" element={<PreviewQuiz />} />} />
          <Route path='/intern_dash/*' element={<PrivateRoute role="intern"  element={<InternDash />} />} />
          <Route path='/SA_dash/*' element={<PrivateRoute role="SA" element={<SADash />} />} />
          <Route path='/hr-dashboard/*' element={<PrivateRoute role="HR" element={<HrPortal />} />} />

          <Route path="/hr-dashboard/post-jobs" element={<PrivateRoute role="HR" element={<PostJobs />} />} />
          <Route path="/hr-dashboard/registration-requests" element={<PrivateRoute role="HR" element={<RegistrationRequests />} />} />
          <Route path="/hr-dashboard/view-jobs" element={<PrivateRoute role="HR" element={<HrViewJobs />} />} />
          <Route path="/hr-dashboard/students-applied" element={<PrivateRoute role="HR" element={<StudentsApplied />} />} />
          <Route path="/hr-dashboard/students/:status" element={<PrivateRoute role="HR" element={<StudentsPlaced />} />} />
          <Route path="/hr-dashboard/hr-leads" element={<PrivateRoute role="HR" element={<HrLeads />} />} />
          <Route path='/hr-dashboard/profile' element={<PrivateRoute role="HR" element={<ProfilePage />} />} />
          <Route path="/hr-dashboard/jd-received" element={<PrivateRoute role="HR" element={<JdReceived />} />} />
          <Route path="/hr-dashboard/companies/:status" element={<PrivateRoute role="HR" element={<JobStatus />} />} />
          <Route path="/student/:candidateID" element={<PrivateRoute role="HR" element={<StudentDetails />} />} />
          <Route path="/companies/:companyID" element={<PrivateRoute role="HR" element={<CompanyData />} />} />
          <Route path='/hr-dashboard/job/:jobId' element={<PrivateRoute role="HR" element={<HrJobDesc />} />} />
          <Route path='/hr-dashboard/add-hr' element={<PrivateRoute role="HR" element={<AddHr />} />} />
          <Route path='/SA_dash/job/:jobId' element={<PrivateRoute role="SA" element={<SAJobDesc />} />} />
          {/* <Route path='/SA_dash/analysis/:token' element={<PrivateRoute role="SA" element={<SAAnalysis />} />} /> */}
          <Route path='SA/analyze/:token' element={<PrivateRoute role="SA" element={<AnalyzeQuiz />} />} />

          <Route path="/hr-dashboard/quiz" element={<PrivateRoute role="HR" element={<QuizDash />} />} />
          <Route path='/edit/create/:token' element={<PrivateRoute role="HR" element={<CreateDash defaultTab="Create" />} />} />
          <Route path='/edit/configure/:token' element={<PrivateRoute role="HR" element={<CreateDash defaultTab="Configure" />} />} />
          <Route path='/edit/publish/:token' element={<PrivateRoute role="HR" element={<CreateDash defaultTab="Publish" />} />} />
          <Route path='/edit/preview/:token' element={<PrivateRoute role="HR" element={<CreateDash defaultTab="Preview" />} />} />
          <Route path='/edit/analyze/:token' element={<PrivateRoute role="HR" element={<CreateDash defaultTab="Analyze" />} />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer autoClose={5000} />
    </div>
  );
}

export default App;
