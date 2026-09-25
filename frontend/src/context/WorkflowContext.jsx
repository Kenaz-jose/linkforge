import React, { createContext, useContext, useState } from 'react';

const WorkflowContext = createContext();

export const useWorkflow = () => useContext(WorkflowContext);

export const WorkflowProvider = ({ children }) => {
  const [phase, setPhase] = useState('topic'); // topic, interview, probe, brief, review, result
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Direct, punchy, and technical (like a senior engineer)');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [probeQuestions, setProbeQuestions] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefId, setBriefId] = useState(null);
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [graphState, setGraphState] = useState(null);

  const resetWorkflow = () => {
    setPhase('topic');
    setTopic('');
    setTone('Direct, punchy, and technical (like a senior engineer)');
    setQuestions([]);
    setCurrentQuestion(null);
    setInterviewComplete(false);
    setAnswers([]);
    setProbeQuestions([]);
    setBrief(null);
    setBriefId(null);
    setSelectedReferences([]);
    setThreadId(null);
    setGraphState(null);
  };

  const value = {
    phase, setPhase,
    topic, setTopic,
    tone, setTone,
    questions, setQuestions,
    currentQuestion, setCurrentQuestion,
    interviewComplete, setInterviewComplete,
    answers, setAnswers,
    probeQuestions, setProbeQuestions,
    brief, setBrief,
    briefId, setBriefId,
    selectedReferences, setSelectedReferences,
    threadId, setThreadId,
    graphState, setGraphState,
    resetWorkflow
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

