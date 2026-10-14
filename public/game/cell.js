// Burst or Wait, with no drawing: one cell at a time, your pal inside it
// making copies, and the cell's alarm rising toward a breaking point you
// can't see.
//
// Each cell goes:
//
//   entering ──▶ copying ──burst()──▶ burst ──▶ (the next cell)
//                   │
//                   └──alarm hits the breaking point──▶ died ──▶ (the next
//                                                         cell, or the end)
//
// Bursting adds every copy made so far to your score. If the cell
// self-destructs first, those copies are lost and you lose a life. The run
// ends when you're out of lives.
//
// createRun() starts a run, step() moves it on by a frame and says what
// happened, for the page to draw and play sounds for, and burst() and
// block() are your two moves. Randomness comes from a `random` function, so
// tests can make it predictable.

// Whole copies made `time` s after getting in, for `virus`.
export function copiesAt(virus, time) {
  return Math.max(0, Math.floor((time - virus.eclipse) * virus.perSecond));
}

function newCell(run) {
  const [low, high] = run.host.breaking;
  return {
    phase: 'entering', // then 'copying', then 'burst' or 'died'
    phaseTime: 0, // s since this phase started
    time: 0, // s since she got in
    copies: 0,
    alarm: 0, // from 0 to 1
    // Hidden from the player. Any point in the range can happen, but high
    // ones more often than low ones (square root of a random number).
    breaking: low + Math.sqrt(run.random()) * (high - low),
    rate: run.host.alarmRate * run.host.tougher ** run.bursts,
    blocked: false, // whether she's used her anti-defense protein here
  };
}

// A new run for `virus` (from VIRUSES) against `host` (HOST).
export function createRun(virus, host, random = Math.random) {
  const run = {
    virus,
    host,
    random,
    number: 1, // which cell you're on
    lives: host.lives,
    score: 0, // copies burst out, in all
    bursts: 0,
    bestBurst: 0,
    over: false,
  };
  run.cell = newCell(run);
  return run;
}

// Whether you can burst now: she's in, and there's at least one copy.
export function canBurst(run) {
  return run.cell.phase === 'copying' && run.cell.copies > 0;
}

// Burst the cell open, releasing every copy so far. Returns the event, or
// null if you can't burst yet.
export function burst(run) {
  if (!canBurst(run)) return null;
  const { cell } = run;
  cell.phase = 'burst';
  cell.phaseTime = 0;
  run.score += cell.copies;
  run.bursts++;
  run.bestBurst = Math.max(run.bestBurst, cell.copies);
  return { type: 'burst', copies: cell.copies };
}

// Whether she can still use her anti-defense protein in this cell.
export function canBlock(run) {
  return run.cell.phase === 'copying' && !run.cell.blocked;
}

// Knock the alarm back, once per cell. Returns whether it worked.
export function block(run) {
  if (!canBlock(run)) return false;
  run.cell.blocked = true;
  run.cell.alarm = Math.max(0, run.cell.alarm - run.virus.block);
  return true;
}

// Move the run on by `dt` s. Returns a list of what happened:
// { type: 'entered' | 'copy' | 'jolt' | 'died' | 'next' | 'over', ... }.
export function step(run, dt) {
  const { cell, host, virus, random } = run;
  const events = [];
  if (run.over) return events;
  cell.phaseTime += dt;

  if (cell.phase === 'entering') {
    if (cell.phaseTime >= host.enterTime) {
      cell.phase = 'copying';
      cell.phaseTime = 0;
      events.push({ type: 'entered' });
    }
    return events;
  }

  if (cell.phase === 'copying') {
    cell.time += dt;
    const copies = copiesAt(virus, cell.time);
    if (copies > cell.copies) {
      cell.copies = copies;
      events.push({ type: 'copy', copies });
    }
    // The cell only notices once her parts start piling up, after the
    // eclipse, so there's always something to burst out with. Then the
    // alarm creeps up unevenly, with the odd sudden jump.
    if (cell.time < virus.eclipse) return events;
    cell.alarm += cell.rate * dt * (0.5 + random());
    if (random() < host.jumpRate * dt) {
      cell.alarm += host.jumpSize * (0.5 + random());
      events.push({ type: 'jolt' });
    }
    if (cell.alarm >= cell.breaking) {
      cell.alarm = cell.breaking;
      cell.phase = 'died';
      cell.phaseTime = 0;
      run.lives--;
      events.push({ type: 'died', lost: cell.copies, breaking: cell.breaking });
    }
    return events;
  }

  // Burst or died: show it for a moment, then on to the next cell.
  if (cell.phaseTime >= host.afterTime) {
    if (run.lives <= 0) {
      run.over = true;
      events.push({ type: 'over', score: run.score });
    } else {
      run.number++;
      run.cell = newCell(run);
      events.push({ type: 'next', number: run.number });
    }
  }
  return events;
}
