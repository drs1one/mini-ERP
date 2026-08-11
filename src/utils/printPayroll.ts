// src/utils/printPayroll.ts

export const printBulletins = (target: any[]) => {
    if (target.length === 0) {
        alert('No employees selected.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bulletin de Paie</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 13px; }
                .page { page-break-after: always; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; border: 1px dashed #ccc; margin-bottom: 20px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; }
                .subtitle { font-size: 12px; color: #666; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
                .box h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
                .text-right { text-align: right; }
                .totals-box { background: #eff6ff; border: 2px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-top: auto; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
                .net-row { font-size: 18px; font-weight: bold; color: #1e40af; border-top: 1px solid #93c5fd; padding-top: 8px; margin-top: 8px; }
                @media print { .page { border: none; margin: 0; padding: 0; height: auto; } }
            </style>
        </head>
        <body>
            ${target.map(emp => {
        const workedHours = Number((emp.cumulative_hours ?? 0).toFixed(2));
        const hoursAmount = Number((workedHours * emp.hourly_rate).toFixed(2));
        const transport = emp.transport_allowance || 0;
        const prime = emp.prime || 0;
        const gross = Number((hoursAmount + transport + prime).toFixed(2));
        const advance = emp.advance || 0;
        const credit = emp.credit || 0;
        const totalDeductions = Number((advance + credit).toFixed(2));
        const net = Number((gross - totalDeductions).toFixed(2));

        return `
                    <div class="page">
                        <div>
                            <div class="header">
                                <div>
                                    <div class="title">Bulletin de Paie</div>
                                    <div class="subtitle">Période : 01/08/2026 - 31/08/2026</div>
                                </div>
                                <div style="text-align: right;">
                                    <strong>Atelier / Station:</strong> ${emp.primary_station || '5yata'}<br/>
                                    <strong>Statut:</strong> ${emp.is_student === 1 ? 'Étudiant' : 'Permanent'}
                                </div>
                            </div>

                            <div class="grid">
                                <div class="box">
                                    <h4>Informations Salarié</h4>
                                    <p><strong>Matricule :</strong> ${emp.matricule}</p>
                                    <p><strong>Nom & Prénom :</strong> ${emp.name}</p>
                                    <p><strong>CIN :</strong> ${emp.cin || '—'}</p>
                                </div>
                                <div class="box">
                                    <h4>Coordonnées & Paiement</h4>
                                    <p><strong>Téléphone :</strong> ${emp.phone || '—'}</p>
                                    <p><strong>Taux Horaire :</strong> ${emp.hourly_rate} DH</p>
                                    <p><strong>Adresse :</strong> ${emp.address || '—'}</p>
                                </div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Élément de Salaire</th>
                                        <th class="text-right">Base / Heures</th>
                                        <th class="text-right">Taux / Montant</th>
                                        <th class="text-right">Total Partiel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Heures Travaillées</td>
                                        <td class="text-right">${workedHours} hrs</td>
                                        <td class="text-right">${emp.hourly_rate} DH</td>
                                        <td class="text-right">${hoursAmount} DH</td>
                                    </tr>
                                    <tr>
                                        <td>Prime</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">${prime} DH</td>
                                    </tr>
                                    <tr>
                                        <td>Transport</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">${transport} DH</td>
                                    </tr>
                                    <tr>
                                        <td>Avance sur Salaire</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right" style="color: red;">-${advance} DH</td>
                                    </tr>
                                    <tr>
                                        <td>Crédit</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right">—</td>
                                        <td class="text-right" style="color: red;">-${credit} DH</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="totals-box">
                            <div class="total-row">
                                <span>Salaire Brut :</span>
                                <strong>${gross} DH</strong>
                            </div>
                            <div class="total-row">
                                <span>Total Déductions (Avance + Crédit) :</span>
                                <strong style="color: red;">-${totalDeductions} DH</strong>
                            </div>
                            <div class="total-row net-row">
                                <span>NET À PAYER :</span>
                                <span>${net} DH</span>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
};

export const printSignatureSheet = (target: any[]) => {
    if (target.length === 0) {
        alert('No employees selected.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = target.map(emp => {
        const workedHours = Number((emp.cumulative_hours ?? 0).toFixed(2));
        const gross = (workedHours * emp.hourly_rate) + (emp.transport_allowance || 0) + (emp.prime || 0);
        const net = gross - (emp.advance || 0) - (emp.credit || 0);
        return `
            <tr>
                <td class="text-center">${emp.matricule}</td>
                <td class="name-col"><strong>${emp.name}</strong></td>
                <td class="text-center"><strong>${workedHours} hrs</strong></td>
                <td class="text-right net-col"><strong>${net.toFixed(2)}&nbsp;DH</strong></td>
                <td class="sign-cell"></td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fiche de Signature - Paie</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; padding: 15px; }
                h2 { text-align: center; color: #1e3a8a; text-transform: uppercase; margin-bottom: 5px; font-size: 18px; }
                .date-range { text-align: center; font-size: 12px; color: #666; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #333; padding: 5px 8px; text-align: left; font-size: 11px; }
                th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .name-col { white-space: nowrap; }
                .net-col { white-space: nowrap; }
                .sign-cell { height: 30px; }
            </style>
        </head>
        <body>
            <h2>État de Signature - Paiement des Salaires</h2>
            <div class="date-range">Période du 01/08/2026 au 31/08/2026</div>
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 50px;">Matricule</th>
                        <th>Nom & Prénom</th>
                        <th class="text-center" style="width: 100px;">Total Heures</th>
                        <th class="text-right" style="width: 110px;">Net à Payer</th>
                        <th class="text-center" style="width: 140px;">Signature / Emargement</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
};

export const printAccountingSheet = (target: any[]) => {
    if (target.length === 0) {
        alert('No employees selected.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>État Comptable Global</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; padding: 20px; font-size: 12px; }
                h2 { text-align: center; color: #1e3a8a; text-transform: uppercase; margin-bottom: 5px; }
                .date-range { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .total-bold { font-weight: bold; background: #f8fafc; }
            </style>
        </head>
        <body>
            <h2>État Comptable Global des Salaires</h2>
            <div class="date-range">Période du 01/08/2026 au 31/08/2026</div>
            <table>
                <thead>
                    <tr>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th class="text-center">Heures</th>
                        <th class="text-right">Taux</th>
                        <th class="text-right">Transport</th>
                        <th class="text-right">Prime</th>
                        <th class="text-right">Brut</th>
                        <th class="text-right">Avance</th>
                        <th class="text-right">Crédit</th>
                        <th class="text-right">Net Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${target.map(emp => {
        const hours = Number((emp.cumulative_hours ?? 0).toFixed(2));
        const gross = Number(((hours * emp.hourly_rate) + (emp.transport_allowance || 0) + (emp.prime || 0)).toFixed(2));
        const net = Number((gross - (emp.advance || 0) - (emp.credit || 0)).toFixed(2));
        return `
                            <tr>
                                <td>${emp.matricule}</td>
                                <td><strong>${emp.name}</strong></td>
                                <td class="text-center">${hours}</td>
                                <td class="text-right">${emp.hourly_rate}</td>
                                <td class="text-right">${emp.transport_allowance || 0}</td>
                                <td class="text-right">${emp.prime || 0}</td>
                                <td class="text-right"><strong>${gross}</strong></td>
                                <td class="text-right" style="color: red;">${emp.advance || 0}</td>
                                <td class="text-right" style="color: red;">${emp.credit || 0}</td>
                                <td class="text-right" style="color: green;"><strong>${net}</strong></td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
};