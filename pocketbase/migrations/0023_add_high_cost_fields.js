migrate(
  (app) => {
    const inventory = app.findCollectionByNameOrId('clinical_inventory')
    if (!inventory.fields.getByName('is_high_cost')) {
      inventory.fields.add(new BoolField({ name: 'is_high_cost' }))
    }
    app.save(inventory)

    const usage = app.findCollectionByNameOrId('inventory_usage')
    if (!usage.fields.getByName('is_verified')) {
      usage.fields.add(new BoolField({ name: 'is_verified' }))
    }
    if (!usage.fields.getByName('verified_at')) {
      usage.fields.add(new DateField({ name: 'verified_at' }))
    }
    if (!usage.fields.getByName('signature_hash')) {
      usage.fields.add(new TextField({ name: 'signature_hash' }))
    }
    app.save(usage)
  },
  (app) => {
    const inventory = app.findCollectionByNameOrId('clinical_inventory')
    inventory.fields.removeByName('is_high_cost')
    app.save(inventory)

    const usage = app.findCollectionByNameOrId('inventory_usage')
    usage.fields.removeByName('is_verified')
    usage.fields.removeByName('verified_at')
    usage.fields.removeByName('signature_hash')
    app.save(usage)
  },
)
