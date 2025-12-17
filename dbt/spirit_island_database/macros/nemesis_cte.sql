{% macro nemesis_cte(nemesis)%}

--- TODO: CHANGE ALL THIS __ JUST PLACEHOLDER FOR NOW
"{{nemesis.abbreviation}}" AS (
    select
        "{{accolade.id}}" AS accolade_id,
        "{{accolade.name}}" AS accolade_name,
        "{{accolade.description}}" AS accolade_description,
        {{accolade.type}}_name
    from {{accolade.type}}_game_data_agg
    where {{accolade.condition}}
    {% if accolade.flavour == "good" %}
        order by win_rate desc
    {% elif accolade.flavour == "bad" %}
        order by loss_rate desc
    {% else %}
        order by {{accolade.type}}_name
    {% endif %}
    limit 1
)

{% endmacro %}