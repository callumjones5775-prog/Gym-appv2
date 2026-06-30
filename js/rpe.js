// rpe.js
// Adaptive progression. Instead of fixed +2.5/+5 steps, each exercise learns
// from its own RPE history: weight moves by a % scaled to how far the last
// effort was from the goal's target RPE, accelerates on easy streaks, and
// drops for recovery if you stall on repeated maximal efforts.

function targetRpe() {
  var g = GOALS[getGoal()];
  return g ? g.targetRpe : 8;
}

// Returns { weight, reason } for the next session of this exercise.
function nextWeight(exName, equipment, lastRpe) {
  var p = user.progression[exName];
  var w = p.weight;
  var rpes = (p.rpes || []).slice();
  var tgt = targetRpe();
  var fakeEx = { equipment: equipment };

  var diff = tgt - lastRpe; // positive = easier than target = push up
  var stepPct = diff * 0.03; // ~3% per RPE point
  var reason = "";

  var recent = rpes.slice(-2).concat([lastRpe]);

  // Easy streak -> accelerate.
  if (
    recent.length >= 3 &&
    recent.every(function (r) {
      return r <= tgt - 1;
    })
  ) {
    stepPct += 0.02;
    reason = "3 easy sessions — accelerating";
  }

  // Repeated maximal grind -> recovery drop.
  if (
    recent.length >= 3 &&
    recent.every(function (r) {
      return r >= 9;
    })
  ) {
    stepPct = -0.1;
    reason = "Stalling — recovery drop";
  }

  if (!reason) {
    if (diff >= 2) reason = "Felt easy — moving up";
    else if (diff > 0) reason = "Slightly easy — small bump";
    else if (diff === 0) reason = "Dialed in — holding";
    else if (diff > -2) reason = "Tough — easing slightly";
    else reason = "Very hard — dropping";
  }

  var nw = roundFor(fakeEx, w * (1 + stepPct));
  if (nw < 0) nw = 0;

  return { weight: nw, reason: reason };
}

// Apply each exercise's own RPE (ex.rpe set on the workout item), logging
// history so the trend logic has per-lift data to learn from.
function applyWorkoutRpe(workout) {
  for (var i = 0; i < workout.exercises.length; i++) {
    var ex = workout.exercises[i];
    var p = user.progression[ex.name];
    if (!p) continue;
    if (!p.rpes) p.rpes = [];

    var rpe = typeof ex.rpe === "number" ? ex.rpe : 8;

    if (ex.weighted && !ex.timed) {
      var next = nextWeight(ex.name, ex.equipment, rpe);
      p.weight = next.weight;
      p.reason = next.reason;
    } else if (ex.timed) {
      p.reason = rpe <= targetRpe() ? "Add 10–15s next time" : "Hold the time";
    } else {
      p.reason = rpe <= targetRpe() ? "Add a rep or two" : "Hold the reps";
    }

    p.rpes.push(rpe);
    if (p.rpes.length > 6) p.rpes = p.rpes.slice(-6);
  }
}
