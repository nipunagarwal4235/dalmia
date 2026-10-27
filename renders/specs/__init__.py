"""Every modelled product, keyed by catalogue product id."""
from . import door_handles, knobs, sofa_legs, others

PRODUCTS = {pid: {'category': module.CATEGORY, **spec}
            for module in (door_handles, knobs, sofa_legs, others) for pid, spec in module.PRODUCTS.items()}
