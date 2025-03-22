// Light/Dark Mode Toggle
const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const newTheme = e.matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
});

// Grade Points Mapping
const gradePoints = {
  'A+': 4.0, 'A': 3.75, 'A-': 3.5,
  'B+': 3.25, 'B': 3.0, 'B-': 2.75,
  'C+': 2.5, 'C': 2.25, 'D': 2.0, 'F': 0.0
};

// Login Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const studentId = document.getElementById('studentId').value;
  const password = document.getElementById('password').value;

  if (!studentId || !password) {
    alert('Please enter both Student ID and Password.');
    return;
  }

  try {
    const loginResponse = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, password }),
    });

    if (loginResponse.status === 401) {
      alert('Invalid Student ID or Password. Please try again.');
      return;
    }

    const { phpSessionId } = await loginResponse.json();

    const resultResponse = await fetch('/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phpSessionId }),
    });

    if (resultResponse.status === 404) {
      alert('No result published yet.');
      return;
    }

    const resultText = await resultResponse.text();

    // Inject the result HTML into a temporary div for parsing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = resultText;

    calculateCGPA(tempDiv);

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
});

function calculateCGPA(container) {
  // Get all rows with class 'productall_row'
  const rows = container.querySelectorAll('.productall_row');
  
  // Track subjects and their latest grades
  const subjectGrades = {};
  const termWiseCreditAndGrade = {};
  const termWiseCredit = {};
  let totalPoints = 0;
  let totalCredits = 0;
  let failedSubjects = [];

  // Track additional statistics
  let totalSubjects = new Set(); // Use Set to count unique subjects
  let totalCleared = 0;
  
  // Track failed subjects
  const failedSubjectsMap = new Map(); // Use Map to track unique failed subjects

  // First pass: collect latest grades and count subjects
  rows.forEach(row => {
      const cells = row.getElementsByTagName('td');
      if (cells.length >= 5) {
          const subjectCode = cells[0].textContent.trim();
          const credits = parseFloat(cells[1].textContent);
          const levelTerm = cells[2].textContent.trim();
          const grade = cells[4].textContent.trim();
          
          totalSubjects.add(subjectCode);
          
          // Update latest grade for the subject
          if (!subjectGrades[subjectCode] || grade !== 'F') {
              subjectGrades[subjectCode] = grade;
          }
      }
  });

  // Count cleared subjects and track currently failed subjects
  Object.entries(subjectGrades).forEach(([subject, grade]) => {
      if (grade !== 'F') {
          totalCleared++;
      } else {
          // Only add to failedSubjectsMap if the latest grade is F
          rows.forEach(row => {
              const cells = row.getElementsByTagName('td');
              if (cells.length >= 5 && cells[0].textContent.trim() === subject && cells[4].textContent.trim() === 'F') {
                  failedSubjectsMap.set(subject, {
                      code: subject,
                      credits: parseFloat(cells[1].textContent),
                      levelTerm: cells[2].textContent.trim()
                  });
              }
          });
      }
  });

  // Second pass: calculate CGPA using latest grades (excluding F grades)
  rows.forEach(row => {
      const cells = row.getElementsByTagName('td');
      if (cells.length >= 5) {
          const subjectCode = cells[0].textContent.trim();
          const credits = parseFloat(cells[1].textContent);
          const levelTerm = cells[2].textContent.trim();
          const currentGrade = cells[4].textContent.trim();
          
          // Only process if this is the latest grade for the subject and it's not an F grade
          if (currentGrade === subjectGrades[subjectCode] && currentGrade !== 'F') {
              const matches = levelTerm.match(/Level (\d+) - Term (\d+)/);
              if (matches && !isNaN(credits) && currentGrade in gradePoints) {
                  const level = matches[1];
                  const term = matches[2];
                  const termKey = `${level}${term}`;

                  // Initialize term objects if they don't exist
                  if (!termWiseCreditAndGrade[termKey]) {
                      termWiseCreditAndGrade[termKey] = 0;
                      termWiseCredit[termKey] = 0;
                  }

                  // Update calculations - only for passed subjects
                  termWiseCreditAndGrade[termKey] += credits * gradePoints[currentGrade];
                  termWiseCredit[termKey] += credits;
                  totalPoints += credits * gradePoints[currentGrade];
                  totalCredits += credits;
              }
          }
      }
  });

  // Convert Map to array for failed subjects
  failedSubjects = Array.from(failedSubjectsMap.values());

  // Calculate overall CGPA
  const overallCGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;

  // Create result display with enhanced styling
  const resultDiv = document.getElementById('result');
  resultDiv.style.display = 'block';

  // Generate HTML for term-wise CGPA
  let termwiseHTML = `
      <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px; font-weight: 600;">
              Term-wise CGPA
          </h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
  `;

  Object.keys(termWiseCredit).sort().forEach(termKey => {
      if (termWiseCredit[termKey] > 0) {
          const termCGPA = (termWiseCreditAndGrade[termKey] / termWiseCredit[termKey]).toFixed(2);
          const level = termKey[0];
          const term = termKey[1];
          termwiseHTML += `
              <div style="background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-size: 12px;">Level ${level} Term ${term}</div>
                  <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">${termCGPA}</div>
              </div>
          `;
      }
  });

  termwiseHTML += '</div></div>';

  // Add failed subjects section if any exist
  let failedSubjectsHTML = '';
  if (failedSubjects.length > 0) {
      failedSubjectsHTML = `
          <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #dc3545; font-size: 16px; font-weight: 600;">
                  Subjects to Clear
              </h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${failedSubjects.map(subject => `
                      <div style="background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid #ffc9c9;">
                          <div style="color: #e03131; font-weight: 500;">${subject.code}</div>
                          <div style="color: #666; font-size: 12px;">
                              ${subject.levelTerm} (${subject.credits} credits)
                          </div>
                      </div>
                  `).join('')}
              </div>
          </div>
      `;
  }

  // Set the complete HTML content
  resultDiv.innerHTML = `
      ${termwiseHTML}
      <div style="border-top: 2px solid #e9ecef; padding-top: 20px; margin-top: 5px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
              <div style="background-color: #e8f5e9; padding: 10px; border-radius: 6px; text-align: center;">
                  <div style="color: #2e7d32; font-size: 12px;">Cleared Subjects</div>
                  <div style="font-size: 18px; font-weight: 600; color: #2e7d32;">${totalCleared}</div>
              </div>
              <div style="background-color: #ffebee; padding: 10px; border-radius: 6px; text-align: center;">
                  <div style="color: #c62828; font-size: 12px;">Short Subjects</div>
                  <div style="font-size: 18px; font-weight: 600; color: #c62828;">${failedSubjects.length}</div>
              </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6c757d;">Total Credits</span>
              <span style="font-weight: 600; color: #28a745;">${totalCredits}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6c757d;">Overall CGPA</span>
              <span style="font-size: 24px; font-weight: 700; color: #28a745;">${overallCGPA}</span>
          </div>
      </div>
      ${failedSubjectsHTML}
  `;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.left = '44%';
  closeButton.style.border = 'none';
  closeButton.style.background = 'none';
  closeButton.style.fontSize = '20px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = '#6c757d';
  closeButton.style.padding = '0 5px';
  closeButton.onclick = () => {
    resultDiv.innerHTML = '';
    resultDiv.style.display = 'none';
  }
  resultDiv.appendChild(closeButton);

  document.body.appendChild(resultDiv);

  const extendedStats = calculateExtendedStats(rows, subjectGrades);
  
  // Add this before adding the target calculator
  addExtendedStats(resultDiv, extendedStats);

  addTargetCalculator(resultDiv, parseFloat(overallCGPA), totalCredits);
  addWhatIfSimulator(resultDiv, rows, subjectGrades, parseFloat(overallCGPA), totalCredits);
}

function calculateRequiredGPA(currentCGPA, currentCredits, targetCGPA, nextSemesterCredits) {
  // Formula: Required GPA = (Target CGPA * (Current Credits + Next Credits) - Current CGPA * Current Credits) / Next Credits
  const requiredGPA = ((targetCGPA * (currentCredits + nextSemesterCredits)) - (currentCGPA * currentCredits)) / nextSemesterCredits;
  return requiredGPA.toFixed(2);
}

function addTargetCalculator(resultDiv, currentCGPA, currentCredits) {
  // Make the main container wider

  const targetCalcHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
              Target CGPA Calculator
          </h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                  <div style="flex: 3;">  <!-- Adjusted flex ratio -->
                      <input type="number" id="nextCredits" placeholder="Next semester credits" 
                             style="width: 97%; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;"
                             step="0.25" min="0">
                  </div>
                  <div style="flex: 2;">  <!-- Adjusted flex ratio -->
                      <input type="number" id="targetCGPA" placeholder="Target" 
                             style="width: 95.5%; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;"
                             step="0.01" min="0" max="4">
                  </div>
              </div>
              <button id="calculateTarget" 
                      style="padding: 10px; background-color: #007bff; color: var(--text-color); border: none; 
                             border-radius: 4px; cursor: pointer; font-weight: 500;">
                  Calculate Required GPA
              </button>
              <div id="targetResult" style="display: none; margin-top: 10px; padding: 15px; 
                                          border-radius: 6px; background-color: var(--bg-color); text-align: center;">
              </div>
          </div>
      </div>
  `;

  const targetDiv = document.createElement('div');
  targetDiv.innerHTML = targetCalcHTML;
  resultDiv.appendChild(targetDiv);

  // Add event listeners
  const calculateBtn = targetDiv.querySelector('#calculateTarget');
  const targetResult = targetDiv.querySelector('#targetResult');
  const nextCreditsInput = targetDiv.querySelector('#nextCredits');
  const targetCGPAInput = targetDiv.querySelector('#targetCGPA');

  calculateBtn.addEventListener('click', () => {
      const nextCredits = parseFloat(nextCreditsInput.value);
      const targetCGPA = parseFloat(targetCGPAInput.value);

      if (isNaN(nextCredits) || isNaN(targetCGPA)) {
          targetResult.style.display = 'block';
          targetResult.style.backgroundColor = '#fff3cd';
          targetResult.style.color = '#856404';
          targetResult.textContent = 'Please enter valid numbers';
          return;
      }

      if (targetCGPA > 4.0) {
          targetResult.style.display = 'block';
          targetResult.style.backgroundColor = '#f8d7da';
          targetResult.style.color = 'var(--text-color)';
          targetResult.textContent = 'Target CGPA cannot exceed 4.0';
          return;
      }

      const requiredGPA = calculateRequiredGPA(currentCGPA, currentCredits, targetCGPA, nextCredits);

      if (requiredGPA > 4.0) {
          targetResult.style.backgroundColor = '#f8d7da';
          targetResult.style.color = 'var(--text-color)';
          targetResult.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 5px;">Target not possible</div>
              <div style="font-size: 13px;">Required GPA (${requiredGPA}) exceeds maximum possible GPA (4.00)</div>
          `;
      } else if (requiredGPA < 0) {
          targetResult.style.backgroundColor = '#d4edda';
          targetResult.style.color = '#155724';
          targetResult.innerHTML = `
              <div style="font-weight: 600;">Target already achieved!</div>
          `;
      } else {
          targetResult.style.backgroundColor = '#e8f5e9';
          targetResult.style.color = '#2e7d32';
          targetResult.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 5px;">Required GPA: ${requiredGPA}</div>
              <div style="font-size: 13px;">for next semester (${nextCredits} credits)</div>
          `;
      }
      targetResult.style.display = 'block';
  });
}

function calculateExtendedStats(rows, subjectGrades) {
  // Separate grade distributions for theory and lab
  const theoryGrades = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'D': 0, 'F': 0
  };
  
  const labGrades = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'D': 0, 'F': 0
  };

  // Process each subject's final grade
  rows.forEach(row => {
      const cells = row.getElementsByTagName('td');
      if (cells.length >= 5) {
          const subjectCode = cells[0].textContent.trim();
          const isLab = cells[3].textContent.trim() === 'Yes';
          const currentGrade = cells[4].textContent.trim();
          
          // Only count if it's the latest grade for the subject
          if (currentGrade === subjectGrades[subjectCode]) {
              if (isLab) {
                  labGrades[currentGrade]++;
              } else {
                  theoryGrades[currentGrade]++;
              }
          }
      }
  });

  return { theoryGrades, labGrades };
}

function addExtendedStats(resultDiv, stats) {
  const statsHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
          <!-- Theory Courses -->
          <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
              Theory Course Grades
          </h3>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px;">
              ${Object.entries(stats.theoryGrades)
                  .filter(([_, count]) => count > 0)
                  .map(([grade, count]) => `
                      <div style="background-color: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid #e9ecef; text-align: center;">
                          <div style="color: #6c757d; font-size: 12px;">${grade}</div>
                          <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">${count}</div>
                      </div>
                  `).join('')}
          </div>

          <!-- Lab Courses -->
          <h3 style="margin: 20px 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
              Lab Course Grades
          </h3>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
              ${Object.entries(stats.labGrades)
                  .filter(([_, count]) => count > 0)
                  .map(([grade, count]) => `
                      <div style="background-color: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid #e9ecef; text-align: center;">
                          <div style="color: #6c757d; font-size: 12px;">${grade}</div>
                          <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">${count}</div>
                      </div>
                  `).join('')}
          </div>

          <!-- Summary -->
          <div style="margin-top: 20px; padding: 15px; background-color: var(--bg-color); border-radius: 6px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                  <div>
                      <div style="color: #495057; font-size: 13px;">Total Theory Courses</div>
                      <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">
                          ${Object.values(stats.theoryGrades).reduce((a, b) => a + b, 0)}
                      </div>
                  </div>
                  <div>
                      <div style="color: #495057; font-size: 13px;">Total Lab Courses</div>
                      <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">
                          ${Object.values(stats.labGrades).reduce((a, b) => a + b, 0)}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  `;

  const statsDiv = document.createElement('div');
  statsDiv.innerHTML = statsHTML;
  resultDiv.appendChild(statsDiv);
}

function addWhatIfSimulator(resultDiv, rows, subjectGrades, currentCGPA, totalCredits) {
  const simulatorHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
              What-If Grade Simulator
          </h3>
          <div id="gradeSimulator" style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                  <select id="subjectSelect" style="flex: 3; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;">
                      <option value="">Select a subject...</option>
                      ${Object.entries(subjectGrades)
                          .map(([code, grade]) => `
                              <option value="${code}" data-current="${grade}">
                                  ${code} (Current: ${grade})
                              </option>
                          `).join('')}
                  </select>
                  <select id="newGrade" style="flex: 2; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;">
                      <option value="">New grade...</option>
                      <option value="A+">A+ (4.00)</option>
                      <option value="A">A (3.75)</option>
                      <option value="A-">A- (3.50)</option>
                      <option value="B+">B+ (3.25)</option>
                      <option value="B">B (3.00)</option>
                      <option value="B-">B- (2.75)</option>
                      <option value="C+">C+ (2.50)</option>
                      <option value="C">C (2.25)</option>
                      <option value="D">D (2.00)</option>
                  </select>
              </div>
              <button id="addSimulation" style="padding: 8px; background-color: #007bff; color: var(--text-color); border: none; 
                                              border-radius: 4px; cursor: pointer; font-weight: 500;">
                  Add to Simulation
              </button>
              <div id="simulationList" style="display: flex; flex-direction: column; gap: 8px;"></div>
              <div id="simulationResult" style="margin-top: 10px; padding: 15px; border-radius: 6px; 
                                              background-color: var(--bg-color); text-align: center; display: none;">
              </div>
          </div>
      </div>
  `;

  const simulatorDiv = document.createElement('div');
  simulatorDiv.innerHTML = simulatorHTML;
  resultDiv.appendChild(simulatorDiv);

  // Track simulated changes
  const simulatedGrades = new Map();
  let simulationCount = 0;

  // Add event listeners
  const subjectSelect = simulatorDiv.querySelector('#subjectSelect');
  const newGradeSelect = simulatorDiv.querySelector('#newGrade');
  const addButton = simulatorDiv.querySelector('#addSimulation');
  const simulationList = simulatorDiv.querySelector('#simulationList');
  const simulationResult = simulatorDiv.querySelector('#simulationResult');

  // Function to disable selected subjects in dropdown
  function updateSubjectDropdown() {
      Array.from(subjectSelect.options).forEach(option => {
          if (option.value && simulatedGrades.has(option.value)) {
              option.disabled = true;
              option.style.color = '#999';
          } else {
              option.disabled = false;
              option.style.color = '';
          }
      });
      // Reset selection to default
      subjectSelect.value = '';
      newGradeSelect.value = '';
  }

  function calculateSimulatedCGPA() {
      let totalPoints = 0;
      let totalCredits = 0;
      const processedSubjects = new Set();

      // Process each row
      rows.forEach(row => {
          const cells = row.getElementsByTagName('td');
          if (cells.length >= 5) {
              const subjectCode = cells[0].textContent.trim();
              const credits = parseFloat(cells[1].textContent);
              const currentGrade = cells[4].textContent.trim();
              
              // Skip if we've already processed this subject
              if (processedSubjects.has(subjectCode)) {
                  return;
              }

              // Only process if it's the latest grade for the subject
              if (currentGrade === subjectGrades[subjectCode]) {
                  processedSubjects.add(subjectCode);
                  
                  // Use simulated grade if available, otherwise use current grade
                  const finalGrade = simulatedGrades.has(subjectCode) ? 
                                   simulatedGrades.get(subjectCode) : 
                                   currentGrade;

                  // Only include in calculation if it's not a failed grade
                  if (!isNaN(credits) && finalGrade in gradePoints && finalGrade !== 'F') {
                      totalPoints += credits * gradePoints[finalGrade];
                      totalCredits += credits;
                  }
              }
          }
      });

      return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  }

  addButton.addEventListener('click', () => {
      const subject = subjectSelect.value;
      const newGrade = newGradeSelect.value;
      const currentGrade = subjectSelect.selectedOptions[0]?.dataset?.current;

      if (subject && newGrade && currentGrade) {
          // Check if subject is already simulated
          if (simulatedGrades.has(subject)) {
              alert('This subject has already been simulated. Remove the existing simulation first.');
              return;
          }

          simulatedGrades.set(subject, newGrade);
          simulationCount++;

          // Add to simulation list
          const simItem = document.createElement('div');
          simItem.style.cssText = 'background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;';
          
          const pointDifference = gradePoints[newGrade] - gradePoints[currentGrade];
          const pointChangeText = pointDifference >= 0 ? `+${pointDifference.toFixed(2)}` : pointDifference.toFixed(2);
          const pointChangeColor = pointDifference >= 0 ? '#28a745' : '#dc3545';

          simItem.innerHTML = `
              <div>
                  <div style="font-weight: 500;">${subject}</div>
                  <div style="font-size: 12px;">
                      <span style="color: #6c757d;">${currentGrade} (${gradePoints[currentGrade].toFixed(2)}) → ${newGrade} (${gradePoints[newGrade].toFixed(2)})</span>
                      <span style="color: ${pointChangeColor}; margin-left: 5px;">${pointChangeText}</span>
                  </div>
              </div>
              <button class="remove-sim" data-subject="${subject}" style="padding: 4px 8px; background: #dc3545; color: var(--text-color); border: none; border-radius: 4px; cursor: pointer;">
                  Remove
              </button>
          `;

          simulationList.appendChild(simItem);

          // Update subject dropdown
          updateSubjectDropdown();

          // Calculate new CGPA
          const simulatedCGPA = calculateSimulatedCGPA();
          const difference = (simulatedCGPA - currentCGPA).toFixed(2);
          const changeText = difference >= 0 ? `+${difference}` : difference;

          simulationResult.style.display = 'block';
          simulationResult.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 5px;">Simulated CGPA: ${simulatedCGPA}</div>
              <div style="font-size: 13px; color: ${difference >= 0 ? '#28a745' : '#dc3545'};">
                  Change: ${changeText}
              </div>
          `;
      }
  });

  // Handle remove buttons
  simulationList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-sim')) {
          const subject = e.target.dataset.subject;
          simulatedGrades.delete(subject);
          e.target.closest('div').remove();
          simulationCount--;

          // Update subject dropdown after removal
          updateSubjectDropdown();

          if (simulationCount === 0) {
              simulationResult.style.display = 'none';
          } else {
              const simulatedCGPA = calculateSimulatedCGPA();
              const difference = (simulatedCGPA - currentCGPA).toFixed(2);
              const changeText = difference >= 0 ? `+${difference}` : difference;

              simulationResult.innerHTML = `
                  <div style="font-weight: 600; margin-bottom: 5px;">Simulated CGPA: ${simulatedCGPA}</div>
                  <div style="font-size: 13px; color: ${difference >= 0 ? '#28a745' : '#dc3545'};">
                      Change: ${changeText}
                  </div>
              `;
          }
      }
  });
} 