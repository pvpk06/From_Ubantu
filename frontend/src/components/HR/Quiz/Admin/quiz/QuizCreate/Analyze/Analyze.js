import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../../../../../../../apiService';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button
} from '@mui/material';
import { FaCheckCircle, FaTimesCircle, FaCircle } from 'react-icons/fa'; // Import additional icons

const AnalyzeQuiz = () => {
  const { token } = useParams();
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const url = `/quiz-responses/${token}`;
        console.log("URL :", url);
        const response = await apiService.get(url);
        console.log("responses:", response.data);
        setQuizData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response ? err.response.data.error : 'Error fetching quiz data');
        setLoading(false);
      }
    };
    fetchQuizData();
  }, [token]);

  const convertToIST = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12; // Convert to 12-hour format
    hours = hours ? hours : 12; // Handle midnight case
    const finalDate = `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    console.log("Formatted Date with AM/PM:", finalDate);
    //return finalDate;
        return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const formatDuration = (seconds) => {
    if (seconds < 0) return 'Invalid duration';
  
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
  
    // Formatting the time parts with leading zeroes if necessary
    const formattedHours = String(hours).padStart(2, '0'); // Ensures hours always have two digits
    const formattedMinutes = String(minutes).padStart(2, '0'); // Ensures minutes always have two digits
    const formattedSeconds = String(secs).padStart(2, '0'); // Ensures seconds always have two digits
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };
  
  const openModal = (response) => {
    setSelectedResponse(response);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedResponse(null);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      {quizData && quizData.responses && quizData.responses.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Domain</strong></TableCell>
                <TableCell><strong>Start Time</strong></TableCell>
                <TableCell><strong>End Time</strong></TableCell>
                <TableCell><strong>Duration</strong></TableCell>
                <TableCell><strong>Score</strong></TableCell>
                <TableCell><strong>Grade</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quizData.responses.map((data, index) => (
                <TableRow key={index}>
                  <TableCell>{data.user_name}</TableCell>
                  <TableCell>{data.user_email}</TableCell>
                  <TableCell>{data.domain}</TableCell>
                  <TableCell>{convertToIST(data.start_time)}</TableCell>
                  <TableCell>{convertToIST(data.end_time).toLocaleString()}</TableCell>
                  <TableCell>{formatDuration(data.duration)} sec </TableCell>
                  <TableCell>{data.score}</TableCell>
                  <TableCell>{data.grade}</TableCell>
                  <TableCell>
                    <Button variant="contained" color="primary" onClick={() => openModal(data)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <p>No responses available for this quiz</p>
      )}

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Quiz Details"
      >
        <div style={{ position: 'relative', padding: '20px' }}>
          <Button
            onClick={closeModal}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </Button>
          {selectedResponse ? (
            <div>
              <h2>Quiz Details</h2>
              <p><strong>Date submitted:</strong> {convertToIST(selectedResponse.start_time).toLocaleString()}</p>
              <p><strong>Score:</strong> {selectedResponse.score}</p>
              <p><strong>Duration:</strong> {selectedResponse.duration} seconds</p>
              <hr />
              <div>
                <p><strong>Questions and Answers:</strong></p>
                {quizData && quizData.pages_data && quizData.pages_data.length > 0 ? (
                  quizData.pages_data.map((page, pageIndex) => (
                    page.question_list.map((question, questionIndex) => {
                      const userAnswer = selectedResponse.responses.find(response =>
                        response.questionText === question.question_text
                      )?.answer;

                      return (
                        <div key={`${pageIndex}-${questionIndex}`} style={{ marginBottom: '20px' }}>
                          <p><strong>Question {pageIndex * 10 + questionIndex + 1}:</strong> {question.question_text}</p>
                          <div style={{ marginLeft: '20px' }}>
                            {question.options_list.map((option, i) => {
                              const isCorrect = option === question.correct_answer;
                              const isUserAnswer = option === userAnswer;
                              const isIncorrectAnswer = isUserAnswer && !isCorrect;

                              return (
                                <p key={i} style={{
                                  color: isCorrect ? 'green' : (isIncorrectAnswer ? 'red' : 'black'),
                                  fontWeight: isCorrect || isUserAnswer ? 'bold' : 'normal',
                                  backgroundColor: isIncorrectAnswer ? '#ffe6e6' : (isCorrect ? '#e6ffe6' : 'transparent'),
                                  padding: '2px',
                                  borderRadius: '4px'
                                }}>
                                  {isCorrect && <FaCheckCircle style={{ marginRight: '5px', color: 'green' }} />}
                                  {isIncorrectAnswer && <FaTimesCircle style={{ marginRight: '5px', color: 'red' }} />}
                                  {!isCorrect && isUserAnswer && !isIncorrectAnswer && <FaCircle style={{ marginRight: '5px', color: 'orange' }} />}
                                  {option}
                                </p>
                              );
                            })}
                          </div>
                          <hr />
                        </div>
                      );
                    })
                  ))
                ) : (
                  <p>No pages data available</p>
                )}
              </div>
            </div>
          ) : (
            <p>Loading response details...</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AnalyzeQuiz;

