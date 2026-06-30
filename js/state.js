// state.js
// Global application state and the default user model.

function getDefaultUser() {
  return {
    "1rm": { bench: null, squat: null, deadlift: null, curl: null },
    // Pre-filled with the user's actual gym. Edit any time in Settings.
    equipment: [
      "dumbbells", "leg-extension", "leg-curl", "pec-deck", "chest-press",
      "lat-pulldown", "smith", "curl-machine", "row-machine", "cable",
      "rower", "treadmill", "bike", "stairmaster", "bodyweight"
    ],
    restrictions: [],
    progression: {}, // { exName: { weight, rpes:[], reason } }
    weeklyGoal: 3,
    history: [], // { date, split, goal, durationMin }
    goal: "muscle", // "strength" | "muscle" | "cardio"
    splitType: "ppl", // ppl | cbla | ul | full
    units: "kg", // "kg" | "lb"
    timeBudget: 40, // minutes available for a session
    customExercises: [], // user-added moves: {name,muscle,equipment,weighted,start,...}
    setupComplete: false, // gates the one-time setup
    lastMaxCheck: null // ISO date of the last 1RM check-in
  };
}

// Fill in fields missing from older saves so nothing crashes on update.
function normalizeUser(u) {
  var def = getDefaultUser();
  if (!u["1rm"]) u["1rm"] = def["1rm"];
  if (!Array.isArray(u.equipment) || u.equipment.length === 0)
    u.equipment = def.equipment;
  if (!Array.isArray(u.restrictions)) u.restrictions = [];
  if (!u.progression) u.progression = {};
  if (typeof u.weeklyGoal !== "number") u.weeklyGoal = def.weeklyGoal;
  if (!Array.isArray(u.history)) u.history = [];
  if (!GOALS_OK(u.goal)) u.goal = def.goal;
  if (typeof u.timeBudget !== "number") u.timeBudget = def.timeBudget;
  if (!SPLIT_PRESETS[u.splitType]) u.splitType = def.splitType;
  if (u.units !== "kg" && u.units !== "lb") u.units = "kg";
  if (typeof u.setupComplete !== "boolean") u.setupComplete = false;
  if (u.lastMaxCheck === undefined) u.lastMaxCheck = null;
  if (!Array.isArray(u.customExercises)) u.customExercises = [];
  return u;
}

function GOALS_OK(g) {
  return g === "strength" || g === "muscle" || g === "cardio";
}

// True if it has been 14+ days since the last 1RM check-in.
function maxCheckDue() {
  if (!user.lastMaxCheck) return true;
  var last = new Date(user.lastMaxCheck).getTime();
  var days = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return days >= 14;
}

// Valid states: home, setup, checkin, plan, workout, rpe, stats
let state = "home";
let day = 0;
let user = normalizeUser(loadData() || getDefaultUser());

let currentWorkout = { split: "", exercises: [] };
let workoutStart = 0; // ms timestamp when the workout screen opened
