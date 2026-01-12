WITH
game_data_raw AS (
    select distinct
        gf.game_id,
        gf.game_score,
        gf.game_win,
        gf.game_difficulty,
        gf.game_cards,
        gf.game_dahan,
        gf.game_blight,
        sd.spirit_id,
        sd.spirit_name,
        ad.adversary_id,
        ad.adversary_name
    from {{ source('main', 'games_fact') }} gf
    left join {{ source('main', 'events_fact') }} ef
        on ef.game_id = gf.game_id
    left join {{ source('main', 'spirits_dim') }} sd
        on sd.spirit_id = ef.spirit_id
    left join {{ source('main', 'adversaries_dim') }} ad
        on ad.adversary_id = ef.adversary_id
    where gf.game_id NOT IN (SELECT * FROM {{ ref('playtest_filter') }})
)
SELECT
    spirit_id,
    spirit_name,
    adversary_id,
    adversary_name,

    -- counts
    COUNT(*) AS total_matchups,

    -- avgs
    AVG(game_score) AS avg_score,
    AVG(IIF(game_win = 10, game_score, null)) AS avg_win_score,
    AVG(IIF(game_win = 0, game_score, null)) AS avg_loss_score,

    -- rates
    ROUND((SUM(game_win)/10)*1.0/COUNT(*), 2) AS win_rate

FROM game_data_raw

WHERE adversary_id IS NOT NULL

GROUP BY
    spirit_id,
    spirit_name,
    adversary_id,
    adversary_name
