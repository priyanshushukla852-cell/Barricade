CREATE TABLE IF NOT EXISTS completed_games (
  id              SERIAL PRIMARY KEY,
  room_code       VARCHAR(6)   NOT NULL,
  winner          VARCHAR(4)   NOT NULL CHECK (winner IN ('red','blue')),
  red_user_id     TEXT         NOT NULL,
  blue_user_id    TEXT         NOT NULL,
  duration_seconds INTEGER     NOT NULL,
  finished_at     TIMESTAMPTZ  DEFAULT NOW()
);
