import React, { useState, useEffect } from 'react';
import './publish.css';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import apiService from '../../../../../../../apiService';

const Publish = () => {
  const { token } = useParams();
  const [quizDetails, setQuizDetails] = useState({});
  const [quizLink, setQuizLink] = useState('');
  const [isLinkVisible, setIsLinkVisible] = useState(false);
  const [status, setStatus] = useState('In Design');
  const [domains, setDomains] = useState([]);
  const [showDomains, setShowDomains] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [showUserAssignment, setShowUserAssignment] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [isAssignedTableVisible, setIsAssignedTableVisible] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await apiService.get('/domains');
        setDomains(response.data);
      } catch (error) {
        console.error('Error fetching domains', error);
      }
    };

    fetchDomains();
  }, []);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const response = await apiService.get(`/get-quiz/${token}`);
        const quizData = response.data;
        if (quizData) {
          const link = `http://localhost:3000/quiz/${token}`;
          setQuizLink(link);
          setIsLinkVisible(true);
          setStatus(quizData.status || 'In Design');
          setPublishedDate(quizData.publishedDate || 'Not Published');
          setQuizDetails(quizData);
        }
      } catch (error) {
        console.error('Error fetching quiz details', error);
      }
    };

    fetchQuizDetails();
  }, [token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiService.get('/intern_data');
        setAvailableUsers(response.data);
      } catch (error) {
        console.error('Error fetching users', error);
        toast.error('Failed to fetch users');
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      try {
        const response = await apiService.get(`/quiz_data/${token}`);
        console.log(response);
        if (response.data && Array.isArray(response.data)) {
          setAssignedStudents(response.data);
        } else {
          setAssignedStudents([]);
        }
      } catch (error) {
        console.error('Error fetching assigned students', error);
      }
    };

    fetchAssignedStudents();
  }, [token]);

  const handleSaveAssignments = async () => {
    setIsLoading(true);
    try {
      await apiService.post('/assign-quiz-to-user', {
        quizId: token,
        userIds: assignedUsers.map(u => u.candidateID)
      });
      toast.success('Quiz assigned successfully!');
      setShowUserAssignment(false);
    } catch (error) {
      console.error('Error assigning quiz', error);
      toast.error('Failed to assign quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToUsers = () => {
    setShowUserAssignment(true);
  };

  const assignUser = (user) => {
    setAssignedUsers([...assignedUsers, user]);
    setAvailableUsers(availableUsers.filter(u => u.candidateID !== user.candidateID));
  };

  const unassignUser = (user) => {
    setAvailableUsers([...availableUsers, user]);
    setAssignedUsers(assignedUsers.filter(u => u.candidateID !== user.candidateID));
  };

  const handleAssignToGroups = () => {
    setShowDomains(true);
  };

  const handleDomainChange = (e) => {
    setSelectedDomain(e.target.value);
  };

  const handleDomainSelect = async () => {
    try {
      const response = await apiService.post('/assign-quiz-to-domain', {
        domain: selectedDomain,
        quizId: token
      });
      if (response.data.success) {
        toast.success('Quiz assigned to domain successfully!');
      }
    } catch (error) {
      console.error('Error assigning quiz to domain', error);
      toast.error('Failed to assign quiz to domain. Please try again.');
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    !assignedStudents.some(assigned => assigned.internID === user.candidateID)
  ).filter(user => user.candidateID?.includes(searchTerm));

  const toggleAssignedTableVisibility = () => {
    setIsAssignedTableVisible(!isAssignedTableVisible);
  };
  
  return (
    <div className="publish-container">
      <ToastContainer />
      <div className='Publish_quiz_container'>
        <div className="form-group1">
          <button id="assignUsers" className="assign-button" onClick={handleAssignToUsers}>
            Assign Users
          </button>
        </div>
        <div className="form-group1">
          <button id="assignGroups" className="assign-button" onClick={handleAssignToGroups}>
            Assign Groups
          </button>
        </div>

        {showDomains && (
          <div className="form-group">
            <label htmlFor="domain">Select Domain to Assign:</label>
            <select id="domain" value={selectedDomain} onChange={handleDomainChange}>
              <option value="">Select Domain</option>
              {domains.map((domain) => (
                <option key={domain.domain} value={domain.domain}>
                  {domain.domain}
                </option>
              ))}
            </select>
            <button onClick={handleDomainSelect} className="assign-button">Assign to Domain</button>
          </div>
        )}

        <div className="assigned-students-container">
          <span>Assigned Users</span>
          <button className="publish-toggle-button" onClick={toggleAssignedTableVisibility}>
            <FontAwesomeIcon icon={isAssignedTableVisible ? faEyeSlash : faEye} />
          </button>
          {isAssignedTableVisible && (
            <table className="assigned-students-table">
              <thead>
                <tr>
                  <th>Candidate ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Domain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedStudents.map(user => (
                  <tr key={user.candidateID}>
                    <td>{user.internID}</td>
                    <td>{user.user_name}</td>
                    <td>{user.user_email}</td>
                    <td>{user.user_domain}</td>
                    <td>{user.status ? 'Completed' : 'Not completed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUserAssignment && (
        <div className="user-assignment-modal">
          <h3>Select users to assign</h3>
          <div className="user-lists">
            <div>
              <h4>Available</h4>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="user-search"
              />
              <ul>
                {filteredAvailableUsers.map(user => (
                  <li key={user.candidateID} onClick={() => assignUser(user)}>{user.candidateID}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Assigned</h4>
              <ul>
                {assignedUsers.map(user => (
                  <li key={user.candidateID} onClick={() => unassignUser(user)}>{user.fullName}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="modal-actions">
            <button onClick={() => setShowUserAssignment(false)}>Cancel</button>
            <button onClick={handleSaveAssignments} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publish;
