{% set accolades = load_seed('accolades') %}

WITH 
spirit_game_data_raw AS (
    select distinct
        gf.game_id,
        gf.game_score,
        gf.game_win,
        gf.game_difficulty,
        gf.game_cards,
        gf.game_dahan,
        gf.game_blight,
        sd.spirit_name
    from {{ source('main', 'games_fact') }} gf
    left join {{ source('main', 'events_fact') }} ef
        on ef.game_id = gf.game_id
    left join {{ source('main', 'spirits_dim') }} sd
        on sd.spirit_id = ef.spirit_id
    where LOWER(sd.spirit_name) NOT LIKE '%custom%'
)
,
spirit_game_data_over_calcs AS (
    select
        game_id,
        game_score,
        game_win,
        game_difficulty,
        game_cards,
        game_dahan,
        game_blight,
        spirit_name,
        AVG(game_score) OVER (PARTITION BY spirit_name) AS avg_spirit_score,
        AVG(IIF(game_win = 10, game_score, null)) OVER (PARTITION BY spirit_name) AS avg_spirit_win_score,
        AVG(IIF(game_win = 0, game_score, null)) OVER (PARTITION BY spirit_name) AS avg_spirit_loss_score
    from spirit_game_data_raw
)
,
spirit_game_data_agg AS (
    select
        spirit_name,

        AVG(game_score) AS avg_score,
        AVG(IIF(game_win = 10, game_score, null)) AS avg_win_score,
        AVG(IIF(game_win = 0, game_score, null)) AS avg_loss_score,
        AVG(game_dahan) AS avg_dahan,
        AVG(game_blight) AS avg_blight,
        AVG(IIF(game_win = 10, game_cards, null) / 2) AS avg_win_cards,
        AVG(IIF(game_win = 0, game_cards, null)) AS avg_loss_cards,

        ROUND((SUM(game_win)/10)*1.0/COUNT(*), 2) AS win_rate,
        ROUND(1-(SUM(game_win)/10)*1.0/COUNT(*), 2) AS loss_rate,

        ROUND((SUM(game_win)/10)*1.0/COUNT(*), 2) / AVG(IIF(game_win = 10, game_score, null)) AS win_rate_to_win_score_ratio,
        ROUND(1-(SUM(game_win)/10)*1.0/COUNT(*), 2) / AVG(IIF(game_win = 0, game_score, null)) AS loss_rate_to_loss_score_ratio,

        ROUND(POWER((AVG(POWER((game_score - avg_spirit_score), 2)) / COUNT(*)), 0.5), 2) AS std_dev_score,
        ROUND(POWER((AVG(POWER(IIF(game_win = 10, (game_score - avg_spirit_win_score), null), 2)) / COUNT(IIF(game_win = 10, game_score, null))), 0.5), 2) AS std_dev_win_score,
        ROUND(POWER((AVG(POWER(IIF(game_win = 0, (game_score - avg_spirit_loss_score), null), 2)) / COUNT(IIF(game_win = 0, game_score, null))), 0.5), 2) AS std_dev_loss_score

    from spirit_game_data_over_calcs
    group by spirit_name
)
,

--SELECT * FROM spirit_game_data_agg


{%- for accolade in accolades %}
    {{ accolade_cte(accolade) }}

    {%- if not loop.last %}
    ,
    {%- endif %}

{%- endfor %}

{%- for accolade in accolades %}
    SELECT * FROM "{{accolade.abbreviation}}"

    {%- if not loop.last %}
    UNION ALL
    {%- endif %}

{%- endfor %}
