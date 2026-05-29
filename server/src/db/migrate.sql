CREATE TABLE IF NOT EXISTS completed_games (
  id              SERIAL PRIMARY KEY,
  room_code       VARCHAR(6)   NOT NULL,
  winner          VARCHAR(4)   NOT NULL CHECK (winner IN ('red','blue')),
  red_user_id     TEXT         NOT NULL,
  blue_user_id    TEXT         NOT NULL,
  duration_seconds INTEGER     NOT NULL,
  finished_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_ratings (
  user_id         TEXT         PRIMARY KEY,
  rating          INTEGER      NOT NULL DEFAULT 1200,
  games_played    INTEGER      NOT NULL DEFAULT 0,
  wins            INTEGER      NOT NULL DEFAULT 0,
  losses          INTEGER      NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_results (
  id                      SERIAL       PRIMARY KEY,
  room_code               VARCHAR(6)   NOT NULL,
  winner_id               TEXT         NOT NULL,
  loser_id                TEXT         NOT NULL,
  winner_rating_before    INTEGER      NOT NULL,
  loser_rating_before     INTEGER      NOT NULL,
  winner_rating_after     INTEGER      NOT NULL,
  loser_rating_after      INTEGER      NOT NULL,
  reason                  TEXT         NOT NULL,
  played_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
