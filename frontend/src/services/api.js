export const getCuratedTopics = async (category) => {
  const response = await fetch(`/api/curate?category=${encodeURIComponent(category)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch curated topics');
  }
  return response.json();
};

export const startInterview = async (topic, tone) => {
  const response = await fetch('/api/interview/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, tone }),
  });
  if (!response.ok) {
    throw new Error('Failed to start interview');
  }
  return response.json();
};

export const nextInterviewTurn = async (topic, tone, answers) => {
  const response = await fetch('/api/interview/turn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, tone, answers }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch next interview turn');
  }

  return response.json();
};

export const probeInterview = async (topic, tone, answers) => {
  const response = await fetch('/api/interview/probe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, tone, answers }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch probe questions');
  }
  return response.json();
};

export const finishInterview = async (topic, tone, answers, wasProbed) => {
  const response = await fetch('/api/interview/finish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, tone, answers, was_probed: wasProbed }),
  });
  if (!response.ok) {
    throw new Error('Failed to finish interview');
  }
  return response.json();
};

export const buildBriefFromPOV = async (topic, tone, pov) => {
  const response = await fetch('/api/pov/brief', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      tone,
      pov,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to build brief from POV');
  }

  return response.json();
};

export const generatePOVOptions = async (topic) => {
  const response = await fetch('/api/pov/options', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate POV options');
  }

  return response.json();
};

export const fetchLiveContext = async (topic, thesis) => {
  const response = await fetch('/api/research/live', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, thesis }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch live context');
  }
  return response.json();
};

export const resumeOptimization = async (threadId, feedback = null, approvedReferences = null) => {
  const response = await fetch('/api/resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
        thread_id: threadId, 
        feedback, 
        approved_references: approvedReferences 
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to resume optimization');
  }
  return response.json();
};

