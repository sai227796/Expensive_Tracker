from flask_sqlalchemy import SQLAlchemy
from datetime import date

db = SQLAlchemy()

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(10), default='📦')
    color = db.Column(db.String(20), default='#AEB6BF')
    expenses = db.relationship('Expense', backref='category', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'icon': self.icon, 'color': self.color}


class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'amount': self.amount,
            'category': self.category.to_dict(),
            'date': self.date.strftime('%Y-%m-%d'),
            'note': self.note
        }