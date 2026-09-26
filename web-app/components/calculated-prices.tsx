import type { Product } from '../lib/types';
import { calculatedPrices, priceFields, priceAmount } from '../lib/pricing.mjs';

export function PriceSummary({ product }: { product: Product }) {
  const prices = calculatedPrices(product.minPrice);
  const perInch = product.variants.some(variant => variant.unit === 'Per inch');
  return <div className="calculated-summary">
    <p>{product.minPrice !== product.maxPrice ? 'Starting calculated prices' : 'Calculated prices'}{perInch ? ' / inch' : ''}</p>
    <dl>{priceFields.map((field, index) => <div key={field.key}>
      <dt>{field.label}</dt><dd>{priceAmount(prices[index])}</dd>
    </div>)}</dl>
  </div>;
}

export function CalculatedPrices({ product }: { product: Product }) {
  const thickness = product.variants.some(variant => variant.thickness);
  const weight = product.variants.some(variant => variant.weight);
  return <section className="calculated-section" aria-labelledby="calculated-title">
    <h2 id="calculated-title" className="section-title">Calculated prices by finish and size</h2>
    <p className="table-note">The discount applies first. Then 18% or 9% is added to the discounted amount. Results are rounded to two decimal places. Scroll sideways to see all six calculated prices.</p>
    {product.variants.length ? <div className="table-scroll" tabIndex={0} aria-label="Scrollable calculated price table">
      <table className="calculated-table">
        <caption className="sr-only">Calculated prices for {product.model}</caption>
        <thead><tr><th scope="col">Finish / color</th>{thickness && <th scope="col">Thickness</th>}{weight && <th scope="col">Weight</th>}<th scope="col">Size</th><th scope="col">Rate basis</th><th scope="col">Listed price</th>{priceFields.map(field => <th scope="col" key={field.key}>{field.label}</th>)}</tr></thead>
        <tbody>{product.variants.flatMap((variant, index) => Object.entries(variant.prices).map(([size, price]) => <tr key={`${index}-${size}`}>
          <td>{variant.finish}</td>{thickness && <td>{variant.thickness || 'Not listed'}</td>}{weight && <td>{variant.weight || 'Not listed'}</td>}<td>{size}</td><td>{variant.unit}</td><td className="price-cell">{priceAmount(price)}</td>
          {calculatedPrices(price).map((amount, fieldIndex) => <td key={priceFields[fieldIndex].key} className={'price-cell' + (amount === null ? ' missing' : '')}>{priceAmount(amount)}</td>)}
        </tr>))}</tbody>
      </table>
    </div> : <p className="table-note">Calculated prices are unavailable because this model has no listed price.</p>}
    <p className="table-note">A dash means the source has no listed price. Per-inch amounts remain rates per inch.</p>
  </section>;
}
