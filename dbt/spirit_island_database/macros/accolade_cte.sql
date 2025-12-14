{% macro accolade_cte(accolade)%}

{{accolade.abbreviation}} AS (
    select
        '{{accolade.id}}' AS accolade_id,
        '{{accolade.name}}' AS accolade_name,
        '{{accolade.description}}' AS accolade_description,
        {{accolade.type}}_name
    from {{accolade.type}}_game_data_agg
    where {{accolade.condition}}
    order by {{accolade.type}}_name
    limit 1
)

{% endmacro %}