# scripts/wait-for-frontend.sh
#!/bin/sh
FRONTEND_URL="http://frontend:8081"
echo "Waiting for frontend at $FRONTEND_URL ..."
until curl -sSf $FRONTEND_URL > /dev/null; do
  sleep 2
done
echo "Frontend is up!"
