// ==UserScript==
// @name         CUET Result Viewer
// @namespace    TheSR
// @version      1.2
// @description  Calculates CGPA from the CUET result page with additional features like Target CGPA Calculator and What-If Grade Simulator
// @author       TheSR
// @match        *://course.cuet.ac.bd/result_published.php
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Create the container for the extension UI
    const extensionContainer = document.createElement("div");
    extensionContainer.id = "cuet-result-viewer";
    document.body.appendChild(extensionContainer);

    // Inject the CSS
    const css = `
    #cuet-result-viewer {
      --bg-color: #ffffff;
      --text-color: #333333;
      --input-bg: #f9f9f9;
      --input-border: #cccccc;
      --button-bg: #007bff;
      --button-hover-bg: #0056b3;
      --result-bg: #f9f9f9;
      --result-border: #cccccc;
    }

    #cuet-result-viewer[data-theme="dark"] {
      --bg-color: #1e1e1e;
      --text-color: #f4f4f4;
      --input-bg: #2d2d2d;
      --input-border: #444444;
      --button-bg: #1a73e8;
      --button-hover-bg: #1557b0;
      --result-bg: #2d2d2d;
      --result-border: #444444;
    }

    #cuet-result-viewer::-webkit-scrollbar {
      display: none;
    }

    #cuet-result-viewer {
      scrollbar-width: none;
    }

    #cuet-result-viewer {
      overflow: auto;
    }
  `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Set the initial theme based on system preference
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
    document
        .getElementById("cuet-result-viewer")
        .setAttribute("data-theme", systemTheme);

    // Update the theme when the system theme changes
    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", e => {
            const newTheme = e.matches ? "dark" : "light";
            document
                .getElementById("cuet-result-viewer")
                .setAttribute("data-theme", newTheme);
        });

    // Grade points mapping
    const gradePoints = {
        "A+": 4.0,
        A: 3.75,
        "A-": 3.5,
        "B+": 3.25,
        B: 3.0,
        "B-": 2.75,
        "C+": 2.5,
        C: 2.25,
        D: 2.0,
        F: 0.0,
    };

    // Function to calculate CGPA
    function calculateCGPA() {
        const rows = document.querySelectorAll(".productall_row");
        const subjectGrades = {};
        const termWiseCreditAndGrade = {};
        const termWiseCredit = {};
        let totalPoints = 0;
        let totalCredits = 0;
        let failedSubjects = [];
        const totalSubjects = new Set();
        let totalCleared = 0;
        const failedSubjectsMap = new Map();

        // First pass: collect latest grades and count subjects
        rows.forEach(row => {
            const cells = row.getElementsByTagName("td");
            if (cells.length >= 6) {
                const subjectCode = cells[0].textContent.trim();
                const credits = parseFloat(cells[1].textContent);
                const levelTerm = cells[2].textContent.trim();
                const grade = cells[4].textContent.trim();

                totalSubjects.add(subjectCode);

                if (!subjectGrades[subjectCode] || grade !== "F") {
                    subjectGrades[subjectCode] = grade;
                }
            }
        });

        // Count cleared subjects and track failed subjects
        Object.entries(subjectGrades).forEach(([subject, grade]) => {
            if (grade !== "F") {
                totalCleared++;
            } else {
                rows.forEach(row => {
                    const cells = row.getElementsByTagName("td");
                    if (
                        cells.length >= 6 &&
                        cells[0].textContent.trim() === subject &&
                        cells[4].textContent.trim() === "F"
                    ) {
                        failedSubjectsMap.set(subject, {
                            code: subject,
                            credits: parseFloat(cells[1].textContent),
                            levelTerm: cells[2].textContent.trim(),
                        });
                    }
                });
            }
        });

        // Second pass: calculate CGPA using latest grades (excluding F grades)
        rows.forEach(row => {
            const cells = row.getElementsByTagName("td");
            if (cells.length >= 6) {
                const subjectCode = cells[0].textContent.trim();
                const credits = parseFloat(cells[1].textContent);
                const levelTerm = cells[2].textContent.trim();
                const currentGrade = cells[4].textContent.trim();

                if (
                    currentGrade === subjectGrades[subjectCode] &&
                    currentGrade !== "F"
                ) {
                    const matches = levelTerm.match(/Level (\d+) - Term ([IVX]+)/);
                    if (!matches) return;
                    if (
                        matches &&
                        !isNaN(credits) &&
                        currentGrade in gradePoints
                    ) {
                        const level = matches[1];
                        const term = matches[2];
                        const termKey = `${level}${term}`;

                        if (!termWiseCreditAndGrade[termKey]) {
                            termWiseCreditAndGrade[termKey] = 0;
                            termWiseCredit[termKey] = 0;
                        }

                        termWiseCreditAndGrade[termKey] +=
                            credits * gradePoints[currentGrade];
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
        const overallCGPA =
            totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;

        // Create result display with enhanced styling
        const resultDiv = document.getElementById("cuet-result-viewer");
        resultDiv.style.padding = "15px";
        resultDiv.style.backgroundColor = "var(--result-bg)";
        resultDiv.style.position = "fixed";
        resultDiv.style.top = "20px";
        resultDiv.style.right = "20px";
        resultDiv.style.zIndex = "9999";
        resultDiv.style.border = "1px solid var(--result-border)";
        resultDiv.style.borderRadius = "10px";
        resultDiv.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
        resultDiv.style.minWidth = "400px";
        resultDiv.style.fontFamily = '"Segoe UI", Arial, sans-serif';
        resultDiv.style.fontSize = "14px";
        resultDiv.style.lineHeight = "1.6";
        resultDiv.style.color = "#343a40";
        resultDiv.style.overflowY = "auto";
        resultDiv.style.maxHeight = "90vh";

        // Generate HTML for term-wise Result
        let termwiseHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px; font-weight: 600;">
          Term-wise Result
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
    `;

        Object.keys(termWiseCredit)
            .sort()
            .forEach(termKey => {
                if (termWiseCredit[termKey] > 0) {
                    const termCGPA = (
                        termWiseCreditAndGrade[termKey] /
                        termWiseCredit[termKey]
                    ).toFixed(2);
                    const level = termKey[0];
                    const term = termKey[1];

                    // Filter rows for the current term
                    const termRows = Array.from(rows).filter(row => {
                        const cells = row.getElementsByTagName("td");
                        if (cells.length >= 6) {
                            const levelTerm = cells[2].textContent.trim();
                            return (
                                levelTerm === `Level ${level} - Term ${term}`
                            );
                        }
                        return false;
                    });

                    // Generate subject details for the term
                    let subjectDetailsHTML = "";
                    termRows.forEach(row => {
                        const cells = row.getElementsByTagName("td");
                        const subjectCode = cells[0].textContent.trim();
                        const credits = cells[1].textContent.trim();
                        const grade = cells[4].textContent.trim();
                        const isLab = cells[3].textContent.trim() === "Yes";

                        subjectDetailsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--text-color);">
              <div style="flex: 3;">
                <div style="font-weight: 500;">${subjectCode}</div>
                <div style="font-size: 12px; color: #6c757d;">${
                    isLab ? "Sessional" : "Theory"
                }</div>
              </div>
              <div style="flex: 1; text-align: right;">
                <div style="font-size: 12px; color: var(--text-color);">${credits} Credits</div>
                <div style="font-size: 14px; font-weight: 600; color: ${
                    grade === "F" ? "#dc3545" : "#28a745"
                };">${grade}</div>
              </div>
            </div>
          `;
                    });

                    // Add term-wise result with subject details
                    termwiseHTML += `
          <div style="background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid var(--text-color); margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="color: #6c757d; font-size: 12px;">Level ${level} Term ${term}</div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text-color);">CGPA: ${termCGPA}</div>
            </div>
            <div style="margin-top: 10px;">
              ${subjectDetailsHTML}
            </div>
          </div>
        `;
                }
            });

        termwiseHTML += "</div></div>";

        // Add failed subjects section if any exist
        let failedSubjectsHTML = "";
        if (failedSubjects.length > 0) {
            failedSubjectsHTML = `
        <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #dc3545; font-size: 16px; font-weight: 600;">
            Subjects to Clear
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${failedSubjects
                .map(
                    subject => `
              <div style="background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid #ffc9c9;">
                <div style="color: #e03131; font-weight: 500;">${subject.code}</div>
                <div style="color: #666; font-size: 12px;">
                  ${subject.levelTerm} (${subject.credits} credits)
                </div>
              </div>
            `
                )
                .join("")}
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
        const closeButton = document.createElement("button");
        closeButton.innerHTML = "×";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.border = "none";
        closeButton.style.background = "none";
        closeButton.style.fontSize = "20px";
        closeButton.style.cursor = "pointer";
        closeButton.style.color = "#6c757d";
        closeButton.style.padding = "0 5px";
        closeButton.onclick = () => resultDiv.remove();
        resultDiv.appendChild(closeButton);

        document.body.appendChild(resultDiv);

        // Add Extended Statistics
        const extendedStats = calculateExtendedStats(rows, subjectGrades);
        addExtendedStats(resultDiv, extendedStats);

        // Add Target CGPA Calculator
        addTargetCalculator(resultDiv, parseFloat(overallCGPA), totalCredits);

        // Add What-If Grade Simulator
        addWhatIfSimulator(
            resultDiv,
            rows,
            subjectGrades,
            parseFloat(overallCGPA),
            totalCredits
        );
    }

    // Function to add Target CGPA Calculator
    function addTargetCalculator(resultDiv, currentCGPA, currentCredits) {
        const targetCalcHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
          Target CGPA Calculator
        </h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <div style="flex: 3;">
              <input type="number" id="nextCredits" placeholder="Next semester credits"
                     style="width: 100%; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;"
                     step="0.25" min="0">
            </div>
            <div style="flex: 2;">
              <input type="number" id="targetCGPA" placeholder="Target"
                     style="width: 100%; padding: 8px; background-color: var(--bg-color); border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px;"
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

        const targetDiv = document.createElement("div");
        targetDiv.innerHTML = targetCalcHTML;
        resultDiv.appendChild(targetDiv);

        const calculateBtn = targetDiv.querySelector("#calculateTarget");
        const targetResult = targetDiv.querySelector("#targetResult");
        const nextCreditsInput = targetDiv.querySelector("#nextCredits");
        const targetCGPAInput = targetDiv.querySelector("#targetCGPA");

        calculateBtn.addEventListener("click", () => {
            const nextCredits = parseFloat(nextCreditsInput.value);
            const targetCGPA = parseFloat(targetCGPAInput.value);

            if (isNaN(nextCredits) || isNaN(targetCGPA)) {
                targetResult.style.display = "block";
                targetResult.style.backgroundColor = "#fff3cd";
                targetResult.style.color = "#856404";
                targetResult.textContent = "Please enter valid numbers";
                return;
            }

            if (targetCGPA > 4.0) {
                targetResult.style.display = "block";
                targetResult.style.backgroundColor = "#f8d7da";
                targetResult.style.color = "var(--text-color)";
                targetResult.textContent = "Target CGPA cannot exceed 4.0";
                return;
            }

            const requiredGPA = calculateRequiredGPA(
                currentCGPA,
                currentCredits,
                targetCGPA,
                nextCredits
            );

            if (requiredGPA > 4.0) {
                targetResult.style.backgroundColor = "#f8d7da";
                targetResult.style.color = "var(--text-color)";
                targetResult.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 5px;">Target not possible</div>
          <div style="font-size: 13px;">Required GPA (${requiredGPA}) exceeds maximum possible GPA (4.00)</div>
        `;
            } else if (requiredGPA < 0) {
                targetResult.style.backgroundColor = "#d4edda";
                targetResult.style.color = "#155724";
                targetResult.innerHTML = `
          <div style="font-weight: 600;">Target already achieved!</div>
        `;
            } else {
                targetResult.style.backgroundColor = "#e8f5e9";
                targetResult.style.color = "#2e7d32";
                targetResult.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 5px;">Required GPA: ${requiredGPA}</div>
          <div style="font-size: 13px;">for next semester (${nextCredits} credits)</div>
        `;
            }
            targetResult.style.display = "block";
        });
    }

    // Function to calculate required GPA
    function calculateRequiredGPA(
        currentCGPA,
        currentCredits,
        targetCGPA,
        nextSemesterCredits
    ) {
        const requiredGPA = (
            (targetCGPA * (currentCredits + nextSemesterCredits) -
                currentCGPA * currentCredits) /
            nextSemesterCredits
        ).toFixed(2);
        return requiredGPA;
    }

    // Function to add What-If Grade Simulator
    function addWhatIfSimulator(
        resultDiv,
        rows,
        subjectGrades,
        currentCGPA,
        totalCredits
    ) {
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
                  .map(
                      ([code, grade]) => `
                <option value="${code}" data-current="${grade}">
                  ${code} (Current: ${grade})
                </option>
              `
                  )
                  .join("")}
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
          <button id="addSimulation"
                  style="padding: 8px; background-color: #007bff; color: var(--text-color); border: none;
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

        const simulatorDiv = document.createElement("div");
        simulatorDiv.innerHTML = simulatorHTML;
        resultDiv.appendChild(simulatorDiv);

        const simulatedGrades = new Map();
        let simulationCount = 0;

        const subjectSelect = simulatorDiv.querySelector("#subjectSelect");
        const newGradeSelect = simulatorDiv.querySelector("#newGrade");
        const addButton = simulatorDiv.querySelector("#addSimulation");
        const simulationList = simulatorDiv.querySelector("#simulationList");
        const simulationResult =
            simulatorDiv.querySelector("#simulationResult");

        function updateSubjectDropdown() {
            Array.from(subjectSelect.options).forEach(option => {
                if (option.value && simulatedGrades.has(option.value)) {
                    option.disabled = true;
                    option.style.color = "#999";
                } else {
                    option.disabled = false;
                    option.style.color = "";
                }
            });
            subjectSelect.value = "";
            newGradeSelect.value = "";
        }

        function calculateSimulatedCGPA() {
            let totalPoints = 0;
            let totalCredits = 0;
            const processedSubjects = new Set();

            rows.forEach(row => {
                const cells = row.getElementsByTagName("td");
                if (cells.length >= 6) {
                    const subjectCode = cells[0].textContent.trim();
                    const credits = parseFloat(cells[1].textContent);
                    const currentGrade = cells[4].textContent.trim();

                    if (processedSubjects.has(subjectCode)) return;

                    if (currentGrade === subjectGrades[subjectCode]) {
                        processedSubjects.add(subjectCode);
                        const finalGrade = simulatedGrades.has(subjectCode)
                            ? simulatedGrades.get(subjectCode)
                            : currentGrade;

                        if (
                            !isNaN(credits) &&
                            finalGrade in gradePoints &&
                            finalGrade !== "F"
                        ) {
                            totalPoints += credits * gradePoints[finalGrade];
                            totalCredits += credits;
                        }
                    }
                }
            });

            return totalCredits > 0
                ? (totalPoints / totalCredits).toFixed(2)
                : "0.00";
        }

        addButton.addEventListener("click", () => {
            const subject = subjectSelect.value;
            const newGrade = newGradeSelect.value;
            const currentGrade =
                subjectSelect.selectedOptions[0]?.dataset?.current;

            if (subject && newGrade && currentGrade) {
                if (simulatedGrades.has(subject)) {
                    alert(
                        "This subject has already been simulated. Remove the existing simulation first."
                    );
                    return;
                }

                simulatedGrades.set(subject, newGrade);
                simulationCount++;

                const simItem = document.createElement("div");
                simItem.style.cssText =
                    "background-color: var(--bg-color); padding: 10px; border-radius: 6px; border: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;";

                const pointDifference =
                    gradePoints[newGrade] - gradePoints[currentGrade];
                const pointChangeText =
                    pointDifference >= 0
                        ? `+${pointDifference.toFixed(2)}`
                        : pointDifference.toFixed(2);
                const pointChangeColor =
                    pointDifference >= 0 ? "#28a745" : "#dc3545";

                simItem.innerHTML = `
          <div>
            <div style="font-weight: 500;">${subject}</div>
            <div style="font-size: 12px;">
              <span style="color: #6c757d;">${currentGrade} (${gradePoints[
                    currentGrade
                ].toFixed(2)}) → ${newGrade} (${gradePoints[newGrade].toFixed(
                    2
                )})</span>
              <span style="color: ${pointChangeColor}; margin-left: 5px;">${pointChangeText}</span>
            </div>
          </div>
          <button class="remove-sim" data-subject="${subject}" style="padding: 4px 8px; background: #dc3545; color: var(--bg-color); border: none; border-radius: 4px; cursor: pointer;">
            Remove
          </button>
        `;

                simulationList.appendChild(simItem);
                updateSubjectDropdown();

                const simulatedCGPA = calculateSimulatedCGPA();
                const difference = (simulatedCGPA - currentCGPA).toFixed(2);
                const changeText =
                    difference >= 0 ? `+${difference}` : difference;

                simulationResult.style.display = "block";
                simulationResult.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 5px;">Simulated CGPA: ${simulatedCGPA}</div>
          <div style="font-size: 13px; color: ${
              difference >= 0 ? "#28a745" : "#dc3545"
          };">
            Change: ${changeText}
          </div>
        `;
            }
        });

        simulationList.addEventListener("click", e => {
            if (e.target.classList.contains("remove-sim")) {
                const subject = e.target.dataset.subject;
                simulatedGrades.delete(subject);
                e.target.closest("div").remove();
                simulationCount--;

                updateSubjectDropdown();

                if (simulationCount === 0) {
                    simulationResult.style.display = "none";
                } else {
                    const simulatedCGPA = calculateSimulatedCGPA();
                    const difference = (simulatedCGPA - currentCGPA).toFixed(2);
                    const changeText =
                        difference >= 0 ? `+${difference}` : difference;

                    simulationResult.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">Simulated CGPA: ${simulatedCGPA}</div>
            <div style="font-size: 13px; color: ${
                difference >= 0 ? "#28a745" : "#dc3545"
            };">
              Change: ${changeText}
            </div>
          `;
                }
            }
        });
    }

    // Function to calculate extended statistics
    function calculateExtendedStats(rows, subjectGrades) {
        const theoryGrades = {
            "A+": 0,
            A: 0,
            "A-": 0,
            "B+": 0,
            B: 0,
            "B-": 0,
            "C+": 0,
            C: 0,
            D: 0,
            F: 0,
        };

        const labGrades = {
            "A+": 0,
            A: 0,
            "A-": 0,
            "B+": 0,
            B: 0,
            "B-": 0,
            "C+": 0,
            C: 0,
            D: 0,
            F: 0,
        };

        rows.forEach(row => {
            const cells = row.getElementsByTagName("td");
            if (cells.length >= 6) {
                const subjectCode = cells[0].textContent.trim();
                const isLab = cells[3].textContent.trim() === "Yes";
                const currentGrade = cells[4].textContent.trim();

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

    // Function to add extended statistics
    function addExtendedStats(resultDiv, stats) {
        const statsHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #e9ecef; padding-top: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
          Theory Course Grades
        </h3>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px;">
          ${Object.entries(stats.theoryGrades)
              .filter(([_, count]) => count > 0)
              .map(
                  ([grade, count]) => `
            <div style="background-color: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid #e9ecef; text-align: center;">
              <div style="color: #6c757d; font-size: 12px;">${grade}</div>
              <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">${count}</div>
            </div>
          `
              )
              .join("")}
        </div>

        <h3 style="margin: 20px 0 15px 0; color: #007bff; font-size: 16px; font-weight: 600;">
          Lab Course Grades
        </h3>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
          ${Object.entries(stats.labGrades)
              .filter(([_, count]) => count > 0)
              .map(
                  ([grade, count]) => `
            <div style="background-color: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid #e9ecef; text-align: center;">
              <div style="color: #6c757d; font-size: 12px;">${grade}</div>
              <div style="font-size: 16px; font-weight: 600; color: var(--text-color);">${count}</div>
            </div>
          `
              )
              .join("")}
        </div>

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

        const statsDiv = document.createElement("div");
        statsDiv.innerHTML = statsHTML;
        resultDiv.appendChild(statsDiv);
    }

    // Create the calculate button
    const calculateButton = document.createElement("button");
    calculateButton.innerHTML = `<span style="margin-right: 8px;">Calculate CGPA</span>
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V0z"/>
            <path d="M8 4v4l3 3-1 1-4-4V4h2z"/>
        </svg>`;
    calculateButton.style.position = "fixed";
    calculateButton.style.top = "20px";
    calculateButton.style.right = "20px";
    calculateButton.style.padding = "10px 20px";
    calculateButton.style.backgroundColor = "#007bff";
    calculateButton.style.color = "#fff";
    calculateButton.style.border = "none";
    calculateButton.style.borderRadius = "8px";
    calculateButton.style.cursor = "pointer";
    calculateButton.style.zIndex = "9999";
    calculateButton.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    calculateButton.style.fontSize = "14px";
    calculateButton.style.fontWeight = "500";
    calculateButton.style.boxShadow = "0 2px 6px rgba(0,123,255,0.4)";
    calculateButton.style.transition = "transform 0.2s, box-shadow 0.2s";

    calculateButton.onmouseover = () => {
        calculateButton.style.backgroundColor = "#0056b3";
        calculateButton.style.transform = "translateY(-1px)";
        calculateButton.style.boxShadow = "0 4px 8px rgba(0,123,255,0.5)";
    };

    calculateButton.onmouseout = () => {
        calculateButton.style.backgroundColor = "#007bff";
        calculateButton.style.transform = "translateY(0)";
        calculateButton.style.boxShadow = "0 2px 6px rgba(0,123,255,0.4)";
    };

    calculateButton.addEventListener("click", () => {
        if (
            document.body.innerHTML.includes(
                "Sorry, no Course result published yet"
            )
        ) {
            alert("Sorry, no Course result published yet");
            return;
        }

        const select = document.querySelector(
            'select[name="dynamic-table_length"]'
        );
        if (select) {
            select.value = "100";
            const event = new Event("change", { bubbles: true });
            select.dispatchEvent(event);

            setTimeout(() => {
                calculateCGPA();
                calculateButton.style.display = "none";
            }, 1000);
        }
    });

    document.body.appendChild(calculateButton);
})();
