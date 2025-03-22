# CUET Result Viewer

Calculates CGPA from the CUET result page with additional features like Target CGPA Calculator and What-If Grade Simulator

- [Website (Only Requires Student ID & Password)](https://thesr.pages.dev/CUET_Result_Viewer/)
- Chrome Extension (Need to be Loged in https://course.cuet.ac.bd)
- Firefox Extension (||)
- TamperMonkey Script (||)

## Features

### 1. CGPA Calculation
- Term-wise CGPA calculation
- Overall CGPA calculation
- Handles repeated courses (uses the latest grade)
- Shows total credits completed

### 2. Grade Distribution Analysis
- Separate analysis for Theory and Lab courses
- Shows count of each grade (A+, A, A-, etc.)
- Visual representation of grade distribution
- Total count of theory and lab courses

### 3. Failed Subjects Tracking
- Lists all subjects that need to be cleared
- Shows subject code, credits, and term information
- Tracks improvement in retaken courses
- Displays unique failed subjects without duplicates

### 4. Target CGPA Calculator
- Calculate required GPA for next semester
- Enter target CGPA and next semester credits
- Shows if target is achievable

### 5. What-If Grade Simulator
- Simulate grade changes for any course
- Real-time CGPA recalculation
- Shows CGPA impact of grade improvements
- Multiple course simulation support
- Easy to add/remove simulated grades

## Installation Steps

### Check Release Page

## Usage Guide

### Basic CGPA Calculation
1. Navigate to the result page
2. Click "Calculate CGPA"
3. View term-wise and overall CGPA

### Using Grade Simulator
1. Select a subject from the dropdown
2. Choose a new grade
3. Click "Add to Simulation"
4. See how your CGPA would change
5. Add multiple subjects to simulate different scenarios

### Setting CGPA Targets
1. Enter your target CGPA
2. Input next semester's credits
3. See the required GPA to achieve your target

## FAQ
- Q: Do you store the Student IDs and Passwords?
- A: Of Course not, lol. I didn't have to implement a proxy server unless for CORS policy.

- Q: Why can't I use Student ID and Password in the Extensions and Scripts?
- A: Well Technically you can but CORS Policy is there to stop you from doing that. As a result it's this way, website uses the backend to fetch the result(acts as a proxy) and then the frontend does the magic.

## Future Development
### Maybe I will Implement a Python Gui Script with all These Feature? Really depends on the Use Case tho as the Current ones are good options as well but maybe I will for the sake of Privacy.

## Credits
- [TheSR (Author of this Repo)](https://github.com/TheSR007)
- [Yeasin (Used his repo and built on top of it)](https://github.com/yeasin097/cuet_cg_calc)