from flask import Flask, render_template, request, jsonify, redirect, url_for
from models import db, Expense, Category
from datetime import datetime, date
import calendar
from sqlalchemy import func, extract

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'expense-tracker-secret-2024'

db.init_app(app)

with app.app_context():
    db.create_all()
    if not Category.query.first():
        defaults = [
            ("Food & Dining", "🍽️", "#FF6B6B"),
            ("Transport", "🚗", "#4ECDC4"),
            ("Shopping", "🛍️", "#45B7D1"),
            ("Entertainment", "🎬", "#96CEB4"),
            ("Health", "💊", "#FFEAA7"),
            ("Utilities", "💡", "#DDA0DD"),
            ("Rent/EMI", "🏠", "#98D8C8"),
            ("Education", "📚", "#F7DC6F"),
            ("Travel", "✈️", "#BB8FCE"),
            ("Others", "📦", "#AEB6BF"),
        ]
        for name, icon, color in defaults:
            db.session.add(Category(name=name, icon=icon, color=color))
        db.session.commit()


@app.route('/')
def index():
    today = date.today()
    return redirect(url_for('dashboard', year=today.year, month=today.month))


@app.route('/dashboard/<int:year>/<int:month>')
def dashboard(year, month):
    categories = Category.query.all()
    today = date.today()

    expenses = Expense.query.filter(
        extract('year', Expense.date) == year,
        extract('month', Expense.date) == month
    ).order_by(Expense.date.desc()).all()

    monthly_total = sum(e.amount for e in expenses)

    cat_data = db.session.query(
        Category.name, Category.color, Category.icon,
        func.sum(Expense.amount).label('total')
    ).join(Expense).filter(
        extract('year', Expense.date) == year,
        extract('month', Expense.date) == month
    ).group_by(Category.id).all()

    daily_data = db.session.query(
        func.strftime('%d', Expense.date).label('day'),
        func.sum(Expense.amount).label('total')
    ).filter(
        extract('year', Expense.date) == year,
        extract('month', Expense.date) == month
    ).group_by(func.strftime('%d', Expense.date)).all()

    days_in_month = calendar.monthrange(year, month)[1]
    daily_totals = {int(d): float(t) for d, t in daily_data}
    daily_chart = [daily_totals.get(d, 0) for d in range(1, days_in_month + 1)]

    trend_data = []
    for i in range(5, -1, -1):
        m = month - i
        y = year
        while m <= 0:
            m += 12
            y -= 1
        total = db.session.query(func.sum(Expense.amount)).filter(
            extract('year', Expense.date) == y,
            extract('month', Expense.date) == m
        ).scalar() or 0
        trend_data.append({
            'label': f"{calendar.month_abbr[m]} {y}",
            'total': float(total)
        })

    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1

    return render_template('dashboard.html',
        year=year, month=month,
        month_name=calendar.month_name[month],
        expenses=expenses,
        categories=categories,
        monthly_total=monthly_total,
        cat_data=cat_data,
        daily_chart=daily_chart,
        days_in_month=days_in_month,
        trend_data=trend_data,
        today=today,
        prev_month=prev_month, prev_year=prev_year,
        next_month=next_month, next_year=next_year,
    )


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.json
    try:
        expense = Expense(
            title=data['title'],
            amount=float(data['amount']),
            category_id=int(data['category_id']),
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            note=data.get('note', '')
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify({'success': True, 'id': expense.id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    data = request.json
    try:
        expense.title = data['title']
        expense.amount = float(data['amount'])
        expense.category_id = int(data['category_id'])
        expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expense.note = data.get('note', '')
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/summary')
def summary():
    year = request.args.get('year', date.today().year, type=int)
    monthly = []
    for m in range(1, 13):
        total = db.session.query(func.sum(Expense.amount)).filter(
            extract('year', Expense.date) == year,
            extract('month', Expense.date) == m
        ).scalar() or 0
        monthly.append({'month': calendar.month_abbr[m], 'total': float(total)})
    return jsonify(monthly)


if __name__ == '__main__':
    app.run(debug=True)