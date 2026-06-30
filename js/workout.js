// workout.js
// Split presets, goal modes, time-based sizing, muscle filtering, generation.

// Selectable split layouts. Days cycle in order.
var SPLIT_PRESETS = {
  ppl: { name: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"] },
  cbla: { name: "Chest / Back / Legs / Arms", days: ["Chest", "Back", "Legs", "Arms"] },
  ul: { name: "Upper / Lower", days: ["Upper", "Lower"] },
  full: { name: "Full Body", days: ["Full"] }
};

// Which muscles each named day trains (core can show up most days).
var DAY_MUSCLES = {
  Push: ["chest", "shoulders", "triceps", "core"],
  Pull: ["back", "biceps", "core"],
  Legs: ["quads", "hamstrings", "glutes", "calves", "core"],
  Chest: ["chest", "shoulders", "triceps", "core"],
  Back: ["back", "biceps", "core"],
  Arms: ["biceps", "triceps", "shoulders", "core"],
  Upper: ["chest", "back", "shoulders", "biceps", "triceps", "core"],
  Lower: ["quads", "hamstrings", "glutes", "calves", "core"],
  Full: ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core"]
};

var GOALS = {
  strength: { label: "Strength", sets: 4, reps: 5, pct: 0.85, rest: 150, repSec: 4, targetRpe: 8.5 },
  muscle: { label: "Muscle", sets: 3, reps: 10, pct: 0.72, rest: 80, repSec: 3, targetRpe: 8 },
  cardio: { label: "Cardio", sets: 3, reps: 16, pct: 0.58, rest: 40, repSec: 2, targetRpe: 7 }
};

function getGoal() {
  return GOALS[user.goal] ? user.goal : "muscle";
}

function getSplitType() {
  return SPLIT_PRESETS[user.splitType] ? user.splitType : "ppl";
}

function currentSplitDays() {
  return SPLIT_PRESETS[getSplitType()].days;
}

function getSplit(d) {
  var days = currentSplitDays();
  return days[d % days.length];
}

var RESTRICTION_MAP = {
  legs: ["quads", "hamstrings", "glutes", "calves"],
  leg: ["quads", "hamstrings", "glutes", "calves"],
  chest: ["chest"],
  back: ["back"],
  shoulders: ["shoulders"],
  shoulder: ["shoulders"],
  arms: ["biceps", "triceps"],
  arm: ["biceps", "triceps"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  core: ["core"],
  abs: ["core"]
};

function blockedMuscles() {
  var blocked = [];
  for (var i = 0; i < user.restrictions.length; i++) {
    var mapped = RESTRICTION_MAP[user.restrictions[i]] || [user.restrictions[i]];
    for (var j = 0; j < mapped.length; j++) {
      if (blocked.indexOf(mapped[j]) === -1) blocked.push(mapped[j]);
    }
  }
  return blocked;
}

// A day is trainable if at least one of its primary (non-core) muscles is open.
function dayTrainable(d) {
  var allowed = DAY_MUSCLES[getSplit(d)] || [];
  var blocked = blockedMuscles();
  for (var i = 0; i < allowed.length; i++) {
    if (allowed[i] === "core") continue;
    if (blocked.indexOf(allowed[i]) === -1) return true;
  }
  return false;
}

function roundFor(ex, w) {
  var heavy = ex.equipment === "smith" || ex.equipment === "chest-press";
  var step = heavy ? 2.5 : 0.5;
  return Math.round(w / step) * step;
}

function getOneRepMax(mapKey) {
  return user["1rm"][mapKey];
}

function initialWeight(ex) {
  var g = GOALS[getGoal()];
  if (ex.map) {
    var rm = getOneRepMax(ex.map);
    if (rm !== null && rm !== undefined && !isNaN(rm)) {
      return roundFor(ex, g.pct * rm);
    }
  }
  return ex.start || 20;
}

function perExerciseSeconds() {
  var g = GOALS[getGoal()];
  return g.sets * (g.reps * g.repSec + g.rest) + 45;
}

function exercisesForTime(minutes) {
  var budget = minutes * 60 - 120;
  var n = Math.floor(budget / perExerciseSeconds());
  if (n < 3) n = 3;
  if (n > 10) n = 10;
  return n;
}

function estimatedMinutes(count, cardioCount) {
  var secs = count * perExerciseSeconds() + 120 + (cardioCount || 0) * 480;
  return Math.round(secs / 60);
}

// Built-in library plus the user's own saved exercises.
function allExercises() {
  return EXERCISE_LIB.concat(user.customExercises || []);
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function ensureProgression(e) {
  if (
    !user.progression[e.name] ||
    typeof user.progression[e.name].weight !== "number"
  ) {
    user.progression[e.name] = {
      weight: initialWeight(e),
      rpes: [],
      reason: ""
    };
  }
}

function toWorkoutItem(e, g) {
  ensureProgression(e);
  return {
    name: e.name,
    muscle: e.muscle,
    equipment: e.equipment,
    weighted: e.weighted !== false,
    timed: e.timed === true,
    compound: e.compound === true,
    sets: g.sets,
    reps: g.reps,
    weight: user.progression[e.name].weight,
    reason: user.progression[e.name].reason || ""
  };
}

function generateWorkout() {
  var split = getSplit(day);
  var allowed = DAY_MUSCLES[split] || DAY_MUSCLES.Full;
  var blocked = blockedMuscles();
  var g = GOALS[getGoal()];

  var pool = [];
  var lib = allExercises();
  for (var i = 0; i < lib.length; i++) {
    var ex = lib[i];
    if (ex.muscle === "cardio") continue;
    if (allowed.indexOf(ex.muscle) === -1) continue;
    if (blocked.indexOf(ex.muscle) !== -1) continue;
    if (user.equipment.indexOf(ex.equipment) === -1) continue;
    pool.push(ex);
  }

  // Primary muscle of the day = first non-core muscle in its list.
  var primary = null;
  for (var pm = 0; pm < allowed.length; pm++) {
    if (allowed[pm] !== "core") { primary = allowed[pm]; break; }
  }

  var compounds = shuffle(pool.filter(function (e) { return e.compound; }));
  var isolation = shuffle(pool.filter(function (e) { return !e.compound; }));

  // Float a primary-muscle compound to the very front so each day leads with it.
  compounds.sort(function (a, b) {
    var ap = a.muscle === primary ? 0 : 1;
    var bp = b.muscle === primary ? 0 : 1;
    return ap - bp;
  });

  var ordered = compounds.concat(isolation);

  var count = exercisesForTime(user.timeBudget || 40);

  // Cardio goal: reserve room for machine finishers.
  var cardioWanted = 0;
  if (getGoal() === "cardio") {
    var cardioPool = shuffle(
      allExercises().filter(function (e) {
        return e.muscle === "cardio" && user.equipment.indexOf(e.equipment) !== -1;
      })
    );
    cardioWanted = Math.min(2, cardioPool.length);
  }

  var liftCount = Math.max(3, count - cardioWanted);
  var chosen = [];
  for (var k = 0; k < ordered.length && chosen.length < liftCount; k++) {
    chosen.push(toWorkoutItem(ordered[k], g));
  }

  // Append cardio finishers.
  if (cardioWanted > 0) {
    var cPool = shuffle(
      allExercises().filter(function (e) {
        return e.muscle === "cardio" && user.equipment.indexOf(e.equipment) !== -1;
      })
    );
    for (var c = 0; c < cardioWanted && c < cPool.length; c++) {
      chosen.push(toWorkoutItem(cPool[c], g));
    }
  }

  return {
    split: split,
    goal: getGoal(),
    exercises: chosen,
    estMin: estimatedMinutes(chosen.length - cardioWanted, cardioWanted)
  };
}
