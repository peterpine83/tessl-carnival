# Hook a Duck

Rubber ducks float round a stream in a loop. Lower your hook to catch one as it
passes.

## How to play

- Move the mouse left and right to move the hook along the rod.
- Click to lower the hook. It catches the first duck it touches on the way down,
  then comes back up. If it touches no duck it turns back at the bottom.
- You have 8 casts. The round ends when the last cast is back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The
eight ducks are numbered 10, 20, 10, 50, 10, 20, 10 and 100. A caught duck goes
back in the stream once the hook is up, so you can catch it again.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `moveHook`, `cast`, `step`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
