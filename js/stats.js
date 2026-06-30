// stats.js
// Streak + training stats derived from user.history.

function startOfWeek(dateLike) {
  var d = new Date(dateLike);
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var dow = (d.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  d.setDate(d.getDate() - dow);
  return d;
}

function weekKeyOf(dateLike) {
  var m = startOfWeek(dateLike);
  return m.getFullYear() + "-" + (m.getMonth() + 1) + "-" + m.getDate();
}

function weeklyCounts() {
  var counts = {};
  for (var i = 0; i < user.history.length; i++) {
    var k = weekKeyOf(user.history[i].date);
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

function currentWeekCount() {
  return weeklyCounts()[weekKeyOf(new Date())] || 0;
}

function computeStreak() {
  var goal = user.weeklyGoal || 3;
  var counts = weeklyCounts();
  var cursor = startOfWeek(new Date());
  var streak = 0;

  if ((counts[weekKeyOf(cursor)] || 0) >= goal) streak++;
  cursor.setDate(cursor.getDate() - 7);

  while ((counts[weekKeyOf(cursor)] || 0) >= goal) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function totalWorkouts() {
  return user.history.length;
}

function splitCounts() {
  var out = {};
  var days = currentSplitDays();
  for (var d = 0; d < days.length; d++) out[days[d]] = 0;
  for (var i = 0; i < user.history.length; i++) {
    var s = user.history[i].split;
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

function avgWorkoutTime() {
  var sum = 0;
  var n = 0;
  for (var i = 0; i < user.history.length; i++) {
    var d = user.history[i].durationMin;
    if (typeof d === "number" && d > 0) {
      sum += d;
      n++;
    }
  }
  return n === 0 ? 0 : Math.round(sum / n);
}
