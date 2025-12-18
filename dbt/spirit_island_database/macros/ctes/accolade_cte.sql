{% macro accolade_cte(accolade)%}

"{{accolade.abbreviation}}" AS (
    select
        "{{accolade.id}}" AS accolade_id,
        "{{accolade.name}}" AS accolade_name,
        "{{accolade.description}}" AS accolade_description,
        {{accolade.type}}_name AS accolade_recipient
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