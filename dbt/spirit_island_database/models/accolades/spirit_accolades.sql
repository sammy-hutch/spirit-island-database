{% set accolades = load_seed('spirit_accolades_list') %}

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
    where gf.game_id NOT IN (SELECT * FROM {{ ref('playtest_filter') }})
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
        IIF(game_win = 10, (game_difficulty*1.0)/5, (game_difficulty*1.0)/2) AS true_game_difficulty,
        AVG(game_score) OVER (PARTITION BY spirit_name) AS avg_spirit_score,
        AVG(IIF(game_win = 10, game_score, null)) OVER (PARTITION BY spirit_name) AS avg_spirit_win_score,
        AVG(IIF(game_win = 0, game_score, null)) OVER (PARTITION BY spirit_name) AS avg_spirit_loss_score,
        COUNT(spirit_name) OVER (PARTITION BY game_id) AS no_of_spirits -- note: if adding adversaries/scenarios to this model, need to add them to this partition
    from spirit_game_data_raw
)
,
spirit_game_data_agg AS (
    select
        spirit_name,

        --flags
        MIN(no_of_spirits) AS min_no_of_spirits, 

        --avgs
        AVG(game_score) AS avg_score,
        AVG(IIF(game_win = 10, game_score, null)) AS avg_win_score,
        AVG(IIF(game_win = 0, game_score, null)) AS avg_loss_score,
        AVG(game_dahan) AS avg_dahan,
        AVG(game_blight) AS avg_blight,
        AVG(IIF(game_win = 10, game_cards, null) / 2) AS avg_win_cards,
        AVG(IIF(game_win = 0, game_cards, null)) AS avg_loss_cards,
        AVG(no_of_spirits) AS avg_no_of_spirits,
        AVG(IIF(no_of_spirits = 1, game_score, null)) AS avg_solo_score,
        AVG(IIF(no_of_spirits != 1, game_score, null)) AS avg_team_score,
        AVG(true_game_difficulty) AS avg_difficulty,

        --rates
        ROUND((SUM(game_win)/10)*1.0/COUNT(*), 2) AS win_rate,
        ROUND(1-(SUM(game_win)/10)*1.0/COUNT(*), 2) AS loss_rate,
        ROUND(SUM(IIF(no_of_spirits = 1, 1, 0))*1.0/COUNT(*), 2) AS solo_rate,

        --ratios
        ROUND(AVG(IIF(no_of_spirits != 1, game_score, null))*1.0 / AVG(IIF(no_of_spirits = 1, game_score, null)), 2) AS team_bias,

        --rates to score ratios
        ROUND((SUM(game_win)/10)*1.0/COUNT(*), 2) / AVG(IIF(game_win = 10, game_score, null)) AS win_rate_to_win_score_ratio,
        ROUND(1-(SUM(game_win)/10)*1.0/COUNT(*), 2) / AVG(IIF(game_win = 0, game_score, null)) AS loss_rate_to_loss_score_ratio,

        --std devs
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
    UNION ALL
{%- endfor %}

SELECT * FROM {{ ref('adversary_nemeses') }}